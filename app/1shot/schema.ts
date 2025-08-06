import { erc7702AuthorizationSchema } from "@uxly/1shot-client";
import { z } from "zod";

export const SearchPromptsActionSchema = z.object({
  query: z.string(),
});

export const contractMethodParamsSchema1: z.ZodType<{
  [key: string]: string | number | boolean | null | undefined;
}> = z.record(z.string(), z.union([z.string(), z.number(), z.boolean()]));

export const contractMethodParamsSchema2: z.ZodType<{
  [key: string]:
    | string
    | number
    | boolean
    | null
    | undefined
    | { [key: string]: any }
    | Array<any>;
}> = z.record(
  z.string(),
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    contractMethodParamsSchema1,
    z.array(contractMethodParamsSchema1),
  ]),
);

export const contractMethodParamsSchema: z.ZodType<{
  [key: string]:
    | string
    | number
    | boolean
    | null
    | undefined
    | { [key: string]: any }
    | Array<any>;
}> = z.record(
  z.string(),
  z.union([
    z.string(),
    z.number(),
    z.boolean(),
    contractMethodParamsSchema1,
    z.array(contractMethodParamsSchema1),
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
    params: contractMethodParamsSchema,
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
