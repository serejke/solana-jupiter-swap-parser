import { describe, expect, test } from "@jest/globals";
import { Connection } from "@solana/web3.js";
import { readFile } from "fs/promises";
import * as path from "path";
import {extract, SwapAttributes} from '../index';

// Make sure JSON.stringify works with BigInt
BigInt.prototype["toJSON"] = function () {
    return this.toString();
};

const connection = new Connection(process.env.NODE_URL || "https://api.mainnet-beta.solana.com");

describe("instruction parser", () => {
    test("verify simple transaction", async () => {
        await compare("2m6e4MBQ2wKiFhtc8d479C6SUKkqEiBzemwxSQVaSdr4zGHdoefxWz28u2rnCtUu7SfcgwWpEBDr3L5NZnEqffnv");
    });

    test("verify transaction with only openbook swap", async () => {
        await compare("4riUkys7tZH6TSTgetiDoee6gG7HrzPqJniXoLm6CDnQ2cmkqdzVAtMjtbTYiVUz8vmhpE7tKkSJa2b2TrkPeuBr");
    });

    test("verify transaction with fee on transfer token", async () => {
        await compare("GCeRpjvfNXZB6BJFQChjpKycdKpRwQGS1BSwUvLjVpJj6NgdzzQACAWt89ZEfEXjeRSqzhDX8CHtzpMUnfJ7VMJ");
    });

    test("verify transaction with jupiter route as inner instruction", async () => {
        await compare("5SnGKXqNQ6zYGfNHQwHWwRtbxnYHUHLbANXgpvCLuXD1LA5paStRBcuXwu2T5eM9xsVWFQTzeUNwPWx6UAQhUb2t");
    });

    test("verify transaction with Meteora Pools Program", async () => {
        await compare("5pcpYhqJyyHHxVaa9mvchML6Njro5Chxv7EFjHPSwxVpdyGAt6uVhd1xUBmXe7ztiuhS1iHFgXm67nwr7mem5itu");
    });

    test("verify transaction with Pump.Fun", async () => {
        await compare("5LjySibknku7FDcaM3YBV49sgCYqcm6ibFSV2rtcyU6ZVxwDLwPTpykajLykGHwpWaECtFkkkR4ck9HXLRrSVzqK");
    });

    test("verify transaction with Marine Finance LiquidUnstake instruction", async () => {
        await compare("3wsLbgu88DjHmfrFCyS5r5NJyyJaYjC9xUQYuSiJEUNBLxKyuEqR9b6WnbrScWaWVKBbCHdxb6TQuB16Ri3pqkzb");
    });

    test("verify transaction multiple Jupiter swaps", async () => {
        await compare("5Rt3HkbvPRtQZ2FKxi8mAbsrTSLUQmb5SaphqD32pntbC3hgxZV9PayGL6pZGMSVXWBrrCAaw8uhDSR6R8J5bkgy");

        await compare("QzA6iW9wJvnWSFx1AB5imT6W5HBEfTXsrmAfk7JV5h13JLKtYeEyiuAQSvveJweewWEB26WfKULN7zE131J4RaY");
    });

    test("verify there is no 'cannot read undefined 'property' error", async () => {
        await compare("3GSj4VMukTHdCUfk2RfsbUdFdKusYwJxTufTtHKDVm2JNjdDY9j3JqM3uz7SQ41n3x2n8VeJLMRMYkNTnzRrXHKo");
    });

    test("sol.fi", async () => {
        await compare("4V4dUfStHa17HREkifsoSradJw9Cjg4NGwGpWSeDSSMuj5u2cs3bDN1Bd12yR29bEmZDXE36Abv13WJd9YQ5Ra23");
    });
});

async function compare(signature: string) {
    const tx = await connection.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0 });
    let swapAttributes: SwapAttributes[];
    try {
        swapAttributes = await extract(tx);
    } catch (e) {
        console.error(e);
    }

    const filePath = path.join(
        __dirname,
        `./results/${signature}.json`
    );
    const result = JSON.parse(await readFile(filePath, "utf8"));

    // Hack to make sure that BigInt can compare in String format
    expect(JSON.parse(JSON.stringify(swapAttributes))).toEqual(result);
}
