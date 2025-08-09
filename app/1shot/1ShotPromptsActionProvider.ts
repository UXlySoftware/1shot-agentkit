import {
  ActionProvider,
  WalletProvider,
  CreateAction,
  EvmWalletProvider,
} from "@coinbase/agentkit";
import {
  assureContractMethodsFromPromptSchema,
  ChainInfo,
  ContractMethod,
  createDelegationSchema,
  Delegation,
  FullPrompt,
  getWalletSchema,
  listChainsSchema,
  listContractMethodsSchema,
  listDelegationsSchema,
  listWalletsSchema,
  OneShotClient,
  PagedResponse,
  Transaction,
  Wallet,
} from "@uxly/1shot-client";
import {
  executeContractMethodSchema,
  encodeContractMethodSchema,
  SearchPromptsActionSchema,
  readContractMethodSchema,
} from "./schema";
import z from "zod";
import {
  Implementation,
  toMetaMaskSmartAccount,
  createDelegation,
  createCaveatBuilder,
} from "@metamask/delegation-toolkit";
import { WalletClient } from "viem";

// Create a new schema without businessId by omitting it from the original schema
const assureContractMethodsFromPromptSchemaWithoutBusinessId =
  assureContractMethodsFromPromptSchema.omit({ businessId: true });

// Create a new schema without businessId by omitting it from the original schema
const listWalletsSchemaWithoutBusinessId = listWalletsSchema.omit({
  businessId: true,
});

const listContractMethodsSchemaWithoutBusinessId =
  listContractMethodsSchema.omit({
    businessId: true,
  });

const createDelegationSchemaWithoutDelegationData = createDelegationSchema
  .omit({
    delegationData: true,
  })
  .extend({
    walletId: z
      .string()
      .uuid()
      .describe(
        "The UUID of the 1ShotWallet to which the local wallet will delegate control.",
      ),
  });

// Define the return type for better type safety
interface ISafeResult<T> {
  success: boolean;
  count?: number;
  result?: T;
  error?: string;
}

// Define an action provider that uses a wallet provider.
export class OneShotActionProvider extends ActionProvider<WalletProvider> {
  protected client: OneShotClient;

  public constructor(
    apiKey: string,
    apiSecret: string,
    protected businessId: string,
    baseUrl?: string,
  ) {
    super("1shot-prompts-action-provider", []);
    this.client = new OneShotClient({
      apiKey: apiKey,
      apiSecret: apiSecret,
      baseUrl: baseUrl,
    });
  }

  // Define if the action provider supports the given network
  public supportsNetwork = () => true;

  @CreateAction({
    name: "list-chains",
    description: `Returns a paged list of the chains that are supported by 1Shot API. 
      The page size is 100 and the page is 1 by default and should list all chains.`,
    schema: listChainsSchema,
  })
  public async listChains(
    args: z.infer<typeof listChainsSchema>,
  ): Promise<PagedResponse<ChainInfo>> {
    console.log("CHARLIE list-wallets called with args:", args);
    return await this.client.chains.list(args);
  }

  @CreateAction({
    name: "list-wallets",
    description: `Returns a filtered, paged list of the Wallets in the user's 1Shot business. 
      Wallets are custodial EOAs controlled by 1Shot. All Contract Methods are associated with a Wallet.
      Wallets are returned with their balance of the native token.
      Only provide a chainId as a filter unless you know for sure a specific value for the other filters.
      This is a paged list, so if you do not find the Contract Method you are looking for but there are more pages, use the tool again.`,
    schema: listWalletsSchemaWithoutBusinessId,
  })
  public async listWallets(
    args: z.infer<typeof listWalletsSchemaWithoutBusinessId>,
  ): Promise<PagedResponse<Wallet>> {
    console.log("CHARLIE list-wallets called with args:", args);
    return await this.client.wallets.list(this.businessId, args);
  }

  @CreateAction({
    name: "list-contract-methods",
    description: `Returns a filtered, paged list of the Contract Methods in the user's 1Shot business.
      Contract Methods are functions on the underlying smart contract that can be executed 
      or manipulated via 1Shot.
      Only provide a chainId or contractAddress as a filter unless you know for sure a specific value for the other filters.
      This is a paged list, so if you do not find the Contract Method you are looking for but there are more pages, use the tool again.`,
    schema: listContractMethodsSchemaWithoutBusinessId,
  })
  public async listContractMethods(
    args: z.infer<typeof listContractMethodsSchemaWithoutBusinessId>,
  ): Promise<PagedResponse<ContractMethod>> {
    console.log("CHARLIE list-contract-methods called with args:", args);
    return await this.client.contractMethods.list(this.businessId, args);
  }

  @CreateAction({
    name: "list-delegations",
    description: `Returns a filtered, paged list of the Delegatoins in the user's 1Shot business.
      Delegations represent permissisons granted to a 1Shot Wallet, enabling it to use the local wallet's funds.`,
    schema: listDelegationsSchema,
  })
  public async listDelegations(
    args: z.infer<typeof listDelegationsSchema>,
  ): Promise<PagedResponse<Delegation>> {
    console.log("CHARLIE list-delegations called with args:", args);
    return await this.client.wallets.listDelegations(args.walletId, args);
  }

  @CreateAction({
    name: "get-wallet",
    description: `Returns a single 1Shot Wallet object, optionally including the balance of native token 
    held by the Wallet. 1Shot Wallets a custodial EOAs controlled by 1Shot, and may be used to execute
    Contract Methods via 1Shot.`,
    schema: getWalletSchema,
  })
  public async getWallet(
    args: z.infer<typeof getWalletSchema>,
  ): Promise<Wallet> {
    console.log("CHARLIE get-wallet called with args:", args);
    return await this.client.wallets.get(args.walletId, args.includeBalances);
  }

  @CreateAction({
    name: "search-prompts",
    description: `Search 1Shot Prompts to find Smart Contracts that will fulfill the user's request.
      A 1Shot Prompt contains information about the smart contract, including which methods
      are important and how to properly use the contract. Once you have chosen a Prompt to use,
      be sure to call the assure-contract-methods action to ensure that all the Contract Methods
      in the prompt are available.`,
    schema: SearchPromptsActionSchema,
  })
  public async searchPrompts(
    args: z.infer<typeof SearchPromptsActionSchema>,
  ): Promise<ISafeResult<FullPrompt[]>> {
    console.log("CHARLIE search-prompts called with args:", args);
    try {
      const results = await this.client.contractMethods.search(args.query);
      // Return a simple object that LangChain can handle
      return {
        success: true,
        count: results.length,
        result: results,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  @CreateAction({
    name: "assure-contract-methods",
    description: `Given a selected 1Shot Prompt Id, this assures that all the Contract Methods in the prompt are available, creating them if required. 
      It returns a list of the contract methods for the prompt. Contract Methods are functions on the underlying smart contract that can be executed 
      or manipulated via 1Shot. 
      You do not need to call list-contract-methods after calling this action.
      You do need to call list-wallets to get the walletId of the 1Shot Wallet to use for the Contract Methods.`,
    schema: assureContractMethodsFromPromptSchemaWithoutBusinessId,
  })
  public async assureContractMethods(
    args: z.infer<
      typeof assureContractMethodsFromPromptSchemaWithoutBusinessId
    >,
  ): Promise<ISafeResult<ContractMethod[]>> {
    console.log("CHARLIE assure-contract-methods called with args:", args);
    try {
      // Call the method with businessId as first parameter and the rest as second parameter
      const results =
        await this.client.contractMethods.assureContractMethodsFromPrompt(
          this.businessId,
          args,
        );

      // Return a simple object that LangChain can handle
      return {
        success: true,
        count: results.length,
        result: results,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  @CreateAction({
    name: "execute-contract-method-with-local-wallet",
    description: `This method will submit a transaction to the blockchain using the AgentKit
      wallet provider. The transaction will use 1Shot to verify the parameters are correct, but it
      will not be executed via 1Shot API's infrastructure.
      The "params" object is the parameters for the contract method, which may be nested.
      If the authorizationList is provided, it will change the local wallet into an ERC-7702 smart wallet.
      Only use this action if the contract method's stateMutability is "nonpayable" or "payable".
      Do not provide any other optional parameters unless they are specifically needed.
      Specifically, do not provide a value for the authorizationList parameter.
      Do not provide a value parameter unless the contract method is payable.`,
    schema: encodeContractMethodSchema,
  })
  public async executeContractMethodWithLocalWallet(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof encodeContractMethodSchema>,
  ): Promise<ISafeResult<ContractMethod[]>> {
    // Debug: Log the received arguments
    console.log(
      "executeContractMethodWithLocalWallet called with args:",
      JSON.stringify(args, null, 2),
    );
    try {
      const contractMethod = await this.client.contractMethods.get(
        args.contractMethodId,
      );

      console.log("CHARLIE contractMethod:", contractMethod);

      const to = contractMethod.contractAddress as `0x${string}`;
      const value = args.value ? BigInt(args.value) : undefined;

      // Call the method with businessId as first parameter and the rest as second parameter
      const encodeResult = await this.client.contractMethods.encode(
        args.contractMethodId,
        args.params,
        args,
      );

      console.log("CHARLIE encode result:", encodeResult);

      const callData = encodeResult.data as `0x${string}`;

      const tx = await walletProvider.sendTransaction({
        to: to,
        value: value,
        data: callData,
      });

      console.log("CHARLIE tx:", tx);

      const txReceipt = await walletProvider.waitForTransactionReceipt(tx);

      console.log("CHARLIE txReceipt:", txReceipt);

      // Return a simple object that LangChain can handle
      return {
        success: true,
        result: txReceipt,
      };
    } catch (error) {
      console.log(
        "CHARLIE execute-contract-method-with-local-wallet error:",
        error,
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  @CreateAction({
    name: "execute-contract-method-with-1shot-wallet",
    description: `This method will execute a Contract Method using its associated 1Shot Wallet.
    It will poll the Transaction's status until it is either completed or failed and return the
    final Transaction object.
    Only use this action if the contract method's stateMutability is "nonpayable" or "payable".
    Always provide a memo parameter to the action, but do not provide any other optional parameters unless they are specifically needed. 
    Most of those values are built into the 1Shot Contract Method.
    Specifically, do not provide a value for the authorizationList parameter.`,
    schema: executeContractMethodSchema,
  })
  public async executeContractMethodWith1ShotWallet(
    args: z.infer<typeof executeContractMethodSchema>,
  ): Promise<ISafeResult<Transaction>> {
    console.log(
      "CHARLIE execute-contract-method-with-1shot-wallet called with args:",
      args,
    );
    try {
      let tx = await this.client.contractMethods.execute(
        args.contractMethodId,
        args.params,
        args,
      );

      // Now we start polling the transaction status until it is either completed or failed
      while (tx.status != "Completed" && tx.status != "Failed") {
        await this.delay(2000);
        tx = await this.client.transactions.get(tx.id);
      }
      return {
        success: true,
        result: tx,
      };
    } catch (error) {
      console.log(
        "CHARLIE execute-contract-method-with-1shot-wallet error:",
        error,
      );
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  @CreateAction({
    name: "read-contract-method",
    description: `This will return the value of a Contract Method by reading the blockchain. 
    You can only use this with Contract Methods who's stateMutability is either "view" or "pure".`,
    schema: readContractMethodSchema,
  })
  public async readContractMethod(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof readContractMethodSchema>,
  ): Promise<ISafeResult<Transaction>> {
    console.log("CHARLIE read-contract-method called with args:", args);
    try {
      const readResult = await this.client.contractMethods.read(
        args.contractMethodId,
        args.params,
      );
      return {
        success: true,
        result: readResult,
      };
    } catch (error) {
      console.log("CHARLIE read-contract-method error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  @CreateAction({
    name: "delegate-to-1shot-wallet",
    description: `This method will have the local wallet sign an ERC-7710 Delegation to a 1Shot Wallet.
    This will allow the 1Shot Wallet to execute Contract Methods using funds in the local wallet, without
    giving the 1Shot Wallet access to the local wallet's private key. `,
    schema: createDelegationSchemaWithoutDelegationData,
  })
  public async delegateTo1ShotWallet(
    walletProvider: EvmWalletProvider,
    args: z.infer<typeof createDelegationSchemaWithoutDelegationData>,
  ): Promise<Delegation> {
    console.log("CHARLIE delegate-to-1shot-wallet called with args:", args);
    const wallet = await this.client.wallets.get(args.walletId);

    const walletAddress = walletProvider.getAddress() as `0x${string}`;

    // We take the data in the args and create a Delegation object and sign it with the local wallet
    const delegatorSmartAccount = await toMetaMaskSmartAccount({
      client: walletProvider as unknown as WalletClient,
      implementation: Implementation.Stateless7702,
      address: walletAddress, // "0x63c0c19a282a1B52b07dD5a65b58948A07DAE32B",
      // Holy crap I hate this, but the walletProvider supports the methods signatory needs
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      signatory: { walletClient: walletProvider as any },
    });

    const environment = delegatorSmartAccount.environment;

    const caveatBuilder = createCaveatBuilder(environment, {
      allowEmptyCaveats: true,
    });

    if (args.contractAddresses != null && args.contractAddresses.length > 0) {
      caveatBuilder.addCaveat(
        "allowedTargets",
        args.contractAddresses as `0x${string}`[],
      );
    }

    if (args.methods != null && args.methods.length > 0) {
      caveatBuilder.addCaveat("allowedMethods", args.methods);
    }

    if (args.startTime != null && args.endTime != null) {
      caveatBuilder.addCaveat("timestamp", args.startTime, args.endTime);
    } else if (args.startTime != null) {
      caveatBuilder.addCaveat("timestamp", args.startTime, 0);
    } else if (args.endTime != null) {
      caveatBuilder.addCaveat("timestamp", 0, args.endTime);
    }

    const caveats = caveatBuilder.build();

    const delegation = createDelegation({
      from: walletProvider.getAddress() as `0x${string}`,
      to: wallet.accountAddress as `0x${string}`,
      caveats: caveats,
    });

    const signature = await delegatorSmartAccount.signDelegation({
      delegation,
    });

    // Store the signature in the delegation
    delegation.signature = signature;

    // Now we need to send the delegation to the BE to store.
    const delegationString = JSON.stringify(delegation);

    return await this.client.wallets.createDelegation(args.walletId, {
      delegationData: delegationString,
      startTime: args.startTime,
      endTime: args.endTime,
      contractAddresses: args.contractAddresses,
    });
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
