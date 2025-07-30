import { ActionProvider, WalletProvider, CreateAction, EvmWalletProvider } from "@coinbase/agentkit";
import { FullPrompt, OneShotClient } from '@uxly/1shot-client';
import { SearchPromptsActionSchema } from "./schema";
import z from "zod";

// Define the return type for better type safety
interface SearchResult {
    success: boolean;
    count?: number;
    prompts?: FullPrompt[];
    error?: string;
}

// Define an action provider that uses a wallet provider.
export class OneShotActionProvider extends ActionProvider<WalletProvider> {
    protected client: OneShotClient;
    
    public constructor(apiKey: string, apiSecret: string, baseUrl?: string) {
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
        name: "search-prompts",
        description: "Search 1Shot Prompts to find Smart Contracts that will fulfill the user's request. A 1Shot Prompt contains information about the smart contract, including which methods are important and how to properly use the contract.",
        schema: SearchPromptsActionSchema,
    })
    public async searchPrompts(args: z.infer<typeof SearchPromptsActionSchema>): Promise<SearchResult> {
        try {
            const results = await this.client.contractMethods.search(args.query);
            // Return a simple object that LangChain can handle
            return {
                success: true,
                count: results.length,
                prompts: results,
            };
        } catch (error) {
            console.error("CHARLIE searchPrompts error:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    @CreateAction({
        name: "execute-with-prompt",
        description: "Search 1Shot Prompts to find Smart Contracts that will fulfill the user's request. A 1Shot Prompt contains information about the smart contract, including which methods are important and how to properly use the contract.",
        schema: SearchPromptsActionSchema,
    })
    public async executeWithPrompt(walletProvider: EvmWalletProvider, args: z.infer<typeof SearchPromptsActionSchema>): Promise<SearchResult> {
        try {
            const results = await this.client.contractMethods.search(args.query);
            
            // Return a simple object that LangChain can handle
            return {
                success: true,
                count: results.length,
                prompts: results,
            };
        } catch (error) {
            console.error("CHARLIE searchPrompts error:", error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }
}