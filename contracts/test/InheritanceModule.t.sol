// SPDX-License-Identifier: MIT
pragma solidity 0.8.20;

import "forge-std/Test.sol";
import "../src/InheritanceModule.sol";

// --- Mock de Safe Account ---
contract MockSafe {
    enum Operation {
        Call,
        DelegateCall
    }

    receive() external payable {}

    function execTransactionFromModule(
        address to,
        uint256 value,
        bytes calldata data,
        Operation /* operation */
    ) external returns (bool success) {
        if (data.length == 0) {
            (success, ) = to.call{value: value}("");
        } else {
            (success, ) = to.call(data);
        }
    }
}

// --- Mock de Token ERC20 ---
contract MockERC20 {
    mapping(address => uint256) public balanceOf;

    constructor() {
        balanceOf[msg.sender] = 1000000 * 10 ** 18;
    }

    function transfer(address to, uint256 value) external returns (bool) {
        require(balanceOf[msg.sender] >= value, "Insufficient balance");
        balanceOf[msg.sender] -= value;
        balanceOf[to] += value;
        return true;
    }
}

// --- Suite de Pruebas ---
contract InheritanceModuleTest is Test {
    InheritanceModule public module;
    MockSafe public safe;
    MockERC20 public token;

    address public oracle = address(0x1);
    address public heir1 = address(0x2);
    address public heir2 = address(0x3);

    address[] public heirs;
    uint256[] public weights;

    function setUp() public {
        safe = new MockSafe();
        token = new MockERC20();

        // Desplegar el módulo estableciendo al MockSafe como el propietario (owner)
        vm.prank(address(safe));
        module = new InheritanceModule(oracle);

        heirs = new address[](2);
        heirs[0] = heir1;
        heirs[1] = heir2;

        weights = new uint256[](2);
        weights[0] = 6000; // 60%
        weights[1] = 4000; // 40%
    }

    function test_ConfigureInheritance_Valid() public {
        vm.prank(oracle);
        module.configureInheritance(heirs, weights, 180 days, 2);

        assertEq(module.inactivityThreshold(), 180 days);
        assertEq(module.quorumRequired(), 2);
        assertEq(module.lastProofOfLife(), block.timestamp);
    }

    function test_ConfigureInheritance_InvalidWeights() public {
        weights[0] = 5000; // Suma 9000 BPS
        vm.prank(oracle);
        vm.expectRevert("Weights must sum to 10000 BPS");
        module.configureInheritance(heirs, weights, 180 days, 2);
    }

    function test_ConfigureInheritance_QuorumTooHigh() public {
        vm.prank(oracle);
        vm.expectRevert("Invalid quorum");
        module.configureInheritance(heirs, weights, 180 days, 3); // Quórum de 3 pero sólo hay 2 herederos
    }

    function test_SubmitProofOfLife_UpdatesTimestamp() public {
        vm.prank(oracle);
        module.configureInheritance(heirs, weights, 180 days, 2);

        // Avanzamos el tiempo 30 días
        skip(30 days);

        vm.prank(address(safe));
        module.submitProofOfLife();

        assertEq(module.lastProofOfLife(), block.timestamp);
    }

    function test_SubmitProofOfLife_CancelsClaim() public {
        vm.prank(oracle);
        module.configureInheritance(heirs, weights, 180 days, 2);

        skip(181 days);

        vm.prank(heir1);
        module.initiateClaim();

        assertEq(module.claimStartTimestamp(), block.timestamp);

        vm.prank(address(safe));
        module.submitProofOfLife();

        assertEq(module.claimStartTimestamp(), 0);
        assertEq(module.signedHeirsCount(), 0);

        (, bool hasSigned) = module.heirs(heir1);
        assertFalse(hasSigned);
    }

    function test_InitiateClaim_BeforeThreshold_Fails() public {
        vm.prank(oracle);
        module.configureInheritance(heirs, weights, 180 days, 2);

        skip(179 days); // Umbral es 180

        vm.prank(heir1);
        vm.expectRevert("Owner is not inactive yet");
        module.initiateClaim();
    }

    function test_InitiateClaim_Valid() public {
        vm.prank(oracle);
        module.configureInheritance(heirs, weights, 180 days, 2);

        skip(181 days);

        vm.prank(heir1);
        module.initiateClaim();

        assertEq(module.claimStartTimestamp(), block.timestamp);
        assertEq(module.signedHeirsCount(), 1);

        (, bool hasSigned) = module.heirs(heir1);
        assertTrue(hasSigned);
    }

    function test_SignClaim_Counts() public {
        vm.prank(oracle);
        module.configureInheritance(heirs, weights, 180 days, 2);

        skip(181 days);

        vm.prank(heir1);
        module.initiateClaim();

        vm.prank(heir2);
        module.signClaim();

        assertEq(module.signedHeirsCount(), 2);

        (, bool hasSigned) = module.heirs(heir2);
        assertTrue(hasSigned);
    }

    function test_ExecutePayout_QuorumNotReached_Fails() public {
        vm.prank(oracle);
        module.configureInheritance(heirs, weights, 180 days, 2);

        skip(181 days);

        vm.prank(heir1);
        module.initiateClaim(); // Sólo 1 firma, quórum requerido es 2

        address[] memory assets = new address[](1);
        assets[0] = address(0); // ETH

        vm.prank(heir1);
        vm.expectRevert("Quorum not reached");
        module.executePayout(assets);
    }

    function test_ExecutePayout_WithinGracePeriod_Works() public {
        // Dotar de balance al Safe de ETH y de Mock Tokens
        deal(address(safe), 10 ether);

        // transferir tokens desde el mock deployer (el test contract posee los tokens)
        token.transfer(address(safe), 1000 * 10 ** 18);

        vm.prank(oracle);
        module.configureInheritance(heirs, weights, 180 days, 2);

        skip(181 days);

        vm.prank(heir1);
        module.initiateClaim();

        vm.prank(heir2);
        module.signClaim();

        address[] memory assets = new address[](2);
        assets[0] = address(0); // ETH
        assets[1] = address(token); // ERC20

        vm.prank(heir1);
        module.executePayout(assets);

        // Verificar distribución correcta de ETH
        assertEq(heir1.balance, 6 ether); // 60%
        assertEq(heir2.balance, 4 ether); // 40%
        assertEq(address(safe).balance, 0);

        // Verificar distribución correcta de ERC20
        assertEq(token.balanceOf(heir1), 600 * 10 ** 18); // 60%
        assertEq(token.balanceOf(heir2), 400 * 10 ** 18); // 40%
        assertEq(token.balanceOf(address(safe)), 0);
    }

    function test_ExecutePayout_GracePeriodExpired_Fails() public {
        vm.prank(oracle);
        module.configureInheritance(heirs, weights, 180 days, 2);

        skip(181 days);

        vm.prank(heir1);
        module.initiateClaim();

        vm.prank(heir2);
        module.signClaim();

        skip(15 days); // Período de gracia es 14 días

        address[] memory assets = new address[](1);
        assets[0] = address(0);

        vm.prank(heir1);
        vm.expectRevert("Grace period expired");
        module.executePayout(assets);
    }

    function test_CancelClaim_ByOwner() public {
        vm.prank(oracle);
        module.configureInheritance(heirs, weights, 180 days, 2);

        skip(181 days);

        vm.prank(heir1);
        module.initiateClaim();

        vm.prank(address(safe));
        module.cancelClaim();

        assertEq(module.claimStartTimestamp(), 0);
        assertEq(module.signedHeirsCount(), 0);
    }

    function test_CancelClaim_NotOwner_Fails() public {
        vm.prank(oracle);
        module.configureInheritance(heirs, weights, 180 days, 2);

        skip(181 days);

        vm.prank(heir1);
        module.initiateClaim();

        vm.prank(heir1);
        vm.expectRevert("Only owner can call");
        module.cancelClaim();
    }
}
