declare global {
  interface Window {
    ethereum?: {
      request: (args: {
        readonly method: string;
        readonly params?: readonly unknown[] | object;
      }) => Promise<unknown>;
    };
  }
}

export {};
