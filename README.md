[![Watch the tutorial](https://img.youtube.com/vi/GfjccyW15Yc/maxresdefault.jpg)](https://youtu.be/GfjccyW15Yc)

# 1Shot Prompts Action Provider for AgentKit

This repository implements an Action Provider for the AgentKit onchain agents framework. Specifically, it injects any smart contract imported into the developer's 1Shot API business account as a callable tool with overlayed prompt instructs that can be writted/edited by the developer or other [1Shot Prompts](https://1shotapi.com/prompts) contributors. 

## Contracts as Tools

1Shot Prompts allows contributed to write high-quality prompt overlays for verified smart contracts in the EVM ecoystem and publish this templates for other developers to import into their 1Shot API context. When an agent hits the `list-methods` endpoint, the available smart contract methods and their associated annotations are returned which can then be leveraged by the LLM for better reasoning about tool calling. 

## Action Provider

1Shot Prompts can be imported as an AgentKit action provider: 

```javascript
    // Initialize AgentKit: https://docs.cdp.coinbase.com/agentkit/docs/agent-actions
    const actionProviders: ActionProvider[] = [

      walletActionProvider(),
      new OneShotActionProvider(
        process.env.ONE_SHOT_API_KEY ?? "INVALID_API_KEY",
        process.env.ONE_SHOT_API_SECRET ?? "INVALID_API_SECRET",
        process.env.ONE_SHOT_BUSINESS_ID ?? "INVALID_BUSINESS_ID",
      ),
    ];
```

Using only this action provider, an AgentKit-powered agent can read and write to any smart contract on any EVM network. The Action Provider supports 3 different execution modes:

1. Submission through the agent's wallet
2. Submission through 1Shot API's server-side wallets
3. Delegated execution through the use of 7702-style smart wallets. 

## Development Instructions
This is a [Next.js](https://nextjs.org) project bootstrapped with `create-onchain-agent`.

It integrates [AgentKit](https://github.com/coinbase/agentkit) to provide AI-driven interactions with on-chain capabilities.

## Getting Started

First, install dependencies:

```sh
npm install
```

Then, configure your environment variables:

```sh
mv .env.local .env
```

Run the development server:

```sh
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to see the project.

## Configuring Your Agent

You can [modify your configuration](https://github.com/coinbase/agentkit/tree/main/typescript/agentkit#usage) of the agent. By default, your agentkit configuration occurs in the `/api/agent/prepare-agentkit.ts` file, and agent instantiation occurs in the `/api/agent/create-agent.ts` file.

### 1. Select Your LLM

Modify the OpenAI model instantiation to use the model of your choice.

### 2. Select Your Wallet Provider

AgentKit requires a **Wallet Provider** to interact with blockchain networks.

### 3. Select Your Action Providers

Action Providers define what your agent can do. You can use built-in providers or create your own.

---

## Next Steps

- Explore the AgentKit README: [AgentKit Documentation](https://github.com/coinbase/agentkit)
- Learn more about available Wallet Providers & Action Providers.
- Experiment with custom Action Providers for your specific use case.

---

## Learn More

- [Learn more about CDP](https://docs.cdp.coinbase.com/)
- [Learn more about AgentKit](https://docs.cdp.coinbase.com/agentkit/docs/welcome)
- [Learn more about Next.js](https://nextjs.org/docs)
- [Learn more about Tailwind CSS](https://tailwindcss.com/docs)

---

## Contributing

Interested in contributing to AgentKit? Follow the contribution guide:

- [Contribution Guide](https://github.com/coinbase/agentkit/blob/main/CONTRIBUTING.md)
- Join the discussion on [Discord](https://discord.gg/CDP)
