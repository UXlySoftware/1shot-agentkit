import { erc7702AuthorizationSchema } from "@uxly/1shot-client";
import { z } from "zod";

export const SearchPromptsActionSchema = z.object({
  query: z.string(),
});

export const contractMethodParamsSchema = z.record(
  z.string(),
  z.union([
    z.string(),
    z.boolean(),
    z.record(z.string(), z.union([z.string(), z.boolean()])),
    z.array(
      z.union([
        z.string(),
        z.boolean(),
        z.record(z.string(), z.union([z.string(), z.boolean()])),
      ]),
    ),
  ]),
);

export const executeContractMethodSchema = z
  .object({
    contractMethodId: z
      .string()
      .uuid()
      .describe(
        "The ID of the contractMethod to execute. Identifies which contractMethod to run",
      ),
    params: contractMethodParamsSchema.describe(
      "The parameters to pass to the contractMethod",
    ),
    walletId: z
      .string()
      .uuid()
      .optional()
      .describe(
        "The ID of the escrow wallet that will execute the contractMethod. If not provided, the default escrow wallet for the contractMethod will be used",
      ),
    memo: z
      .string()
      .optional()
      .describe(
        "Optional text supplied when the contractMethod is executed. This can be a note to the user about why the execution was done, or formatted information such as JSON that can be used by the user's system",
      ),
    authorizationList: z
      .array(erc7702AuthorizationSchema)
      .optional()
      .describe(
        "A list of authorizations for the contractMethod. If you are using ERC-7702, you must provide at least one authorization",
      ),
    value: z
      .string()
      .optional()
      .describe(
        "The amount of native token to send along with the contractMethod. This is only applicable for contractMethods that are payable. Including this value for a nonpayable method will result in an error",
      ),
    contractAddress: z
      .string()
      .optional()
      .describe(
        "The address of the smart contract. Can be overridden for this specific execution",
      ),
  })
  .describe(
    "Parameters required to execute a contractMethod. Includes the function parameters, optional escrow wallet override, optional memo, optional value for payable methods, and optional contract address override",
  );

export const encodeContractMethodSchema = z
  .object({
    contractMethodId: z
      .string()
      .uuid()
      .describe(
        "The ID of the contractMethod to encode. Identifies which contractMethod to encode",
      ),
    params: contractMethodParamsSchema,
    authorizationList: z
      .array(erc7702AuthorizationSchema)
      .optional()
      .describe(
        "A list of authorizations for the contractMethod. If you are using ERC-7702, you must provide at least one authorization",
      ),
    value: z
      .string()
      .optional()
      .describe(
        "The amount of native token to send along with the contractMethod. This is only applicable for contractMethods that are payable. Including this value for a nonpayable method will result in an error",
      ),
  })
  .describe(
    "Parameters for encoding a contractMethod - returns hex string of encoded data. Used to call the contractMethod directly on the blockchain",
  );

export const readContractMethodSchema = z
  .object({
    contractMethodId: z
      .string()
      .uuid()
      .describe(
        "The ID of the contractMethod to read. Identifies which contractMethod to query",
      ),
    params: contractMethodParamsSchema,
  })
  .describe(
    "Parameters for reading a contractMethod - gets result of view or pure function. Used for reading blockchain state without making changes",
  );
