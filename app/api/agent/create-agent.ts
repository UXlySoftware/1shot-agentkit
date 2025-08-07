import { getLangChainTools } from "@coinbase/agentkit-langchain";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatOpenAI } from "@langchain/openai";
import { prepareAgentkitAndWalletProvider } from "./prepare-agentkit";

/**
 * Agent Configuration Guide
 *
 * This file handles the core configuration of your AI agent's behavior and capabilities.
 *
 * Key Steps to Customize Your Agent:
 *
 * 1. Select your LLM:
 *    - Modify the `ChatOpenAI` instantiation to choose your preferred LLM
 *    - Configure model parameters like temperature and max tokens
 *
 * 2. Instantiate your Agent:
 *    - Pass the LLM, tools, and memory into `createReactAgent()`
 *    - Configure agent-specific parameters
 */

// The agent
let agent: ReturnType<typeof createReactAgent>;

/**
 * Initializes and returns an instance of the AI agent.
 * If an agent instance already exists, it returns the existing one.
 *
 * @function getOrInitializeAgent
 * @returns {Promise<ReturnType<typeof createReactAgent>>} The initialized AI agent.
 *
 * @description Handles agent setup
 *
 * @throws {Error} If the agent initialization fails.
 */
export async function createAgent(): Promise<
  ReturnType<typeof createReactAgent>
> {
  // If agent has already been initialized, return it
  if (agent) {
    return agent;
  }

  if (!process.env.OPENAI_API_KEY) {
    throw new Error(
      "I need an OPENAI_API_KEY in your .env file to power my intelligence.",
    );
  }

  const { agentkit, walletProvider } = await prepareAgentkitAndWalletProvider();

  try {
    // Initialize LLM: https://platform.openai.com/docs/models#gpt-4o
    const llm = new ChatOpenAI({
      model: "gpt-4o-mini",
      // verbose: true, // Enable verbose logging
    });

    const tools = await getLangChainTools(agentkit);
    const memory = new MemorySaver();

    // Initialize Agent
    const canUseFaucet =
      walletProvider.getNetwork().networkId == "base-sepolia";
    const faucetMessage = `If you ever need funds, you can request them from the faucet.`;
    const cantUseFaucetMessage = `If you need funds, you can provide your wallet details and request funds from the user.`;
    agent = createReactAgent({
      llm,
      tools,
      checkpointSaver: memory,
      messageModifier: `
        You are a helpful agent that can interact onchain using the Coinbase Developer Platform AgentKit. You are 
        empowered to interact onchain using your tools. ${canUseFaucet ? faucetMessage : cantUseFaucetMessage}.
        Before executing your first action, get the wallet details to see what network 
        you're on. If there is a 5XX (internal) HTTP error code, ask the user to try again later. 
        Refrain from restating your tools' descriptions unless it is explicitly requested.
        The local wallet is on the ${walletProvider.getNetwork().networkId} network with chain ID ${walletProvider.getNetwork().chainId} and has address ${walletProvider.getAddress()}.
        Any time the user specifies an action related to the blockchain, use the chain Id of the local wallet unless specifically requested by the user.
        You are equipped with 1Shot API tools. You can use list-wallets, list-contract-methods, list-chains, and list-delegations to determine what resources are already in 1Shot API.
        When you need to find a smart contract to do an action requested by the user, formulate a description of the action you want to perform and use search-prompts to find a contract that can perform that action.
        Choose an appropriate prompt and then use assure-contract-methods to ensure that all the Contract Methods in the prompt are available in 1Shot.
        You can then use these contract methods in multiple ways ways:
        1. Use execute-contract-method-with-local-wallet to execute the contract method with the local wallet.
        2. Use execute-contract-method-with-1shot-wallet to execute the contract method via the 1Shot Wallet, providing overrides as necessary.
        3. Use read-contract-method to read the value of a Contract Method (for example, using getBalance(account) to read the balance of a coin).
        If unsure about what contract methods are available, use list-contract-methods to get a list of all the contract methods available.
        Provide a short breakdown of the steps you will take to complete the user's request.
        Prefer using the 1Shot API tools over the local wallet tools when possible.
        `,
    });

    return agent;
  } catch (error) {
    console.error("Error initializing agent:", error);
    throw new Error("Failed to initialize agent");
  }
}
