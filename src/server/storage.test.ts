import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { readAsset, storage, uploadAsset } from "./storage";

type MockCommand = { constructor: { name: string }; input: Record<string, unknown> };
type MutableStorage = { send: (command: MockCommand) => Promise<unknown> };

const mutableStorage = storage as unknown as MutableStorage;
const originalSend = mutableStorage.send;
let commands: MockCommand[];
let bucketExists = true;

beforeEach(() => {
  commands = [];
  bucketExists = true;
  mutableStorage.send = async (command) => {
    commands.push(command);
    if (command.constructor.name === "HeadBucketCommand" && !bucketExists) throw new Error("bucket missing");
    if (command.constructor.name === "GetObjectCommand") {
      return {
        ContentType: "image/png",
        Body: { transformToByteArray: async () => new Uint8Array([1, 2, 3]) },
      };
    }
    return {};
  };
});

afterEach(() => {
  mutableStorage.send = originalSend;
});

describe("asset storage", () => {
  test("uploads an asset after ensuring the bucket exists", async () => {
    const key = await uploadAsset(new File(["image-data"], "profile.png", { type: "image/png" }));

    expect(key).toMatch(/^uploads\/[0-9a-f-]+\.png$/);
    expect(commands.map((command) => command.constructor.name)).toEqual(["HeadBucketCommand", "PutObjectCommand"]);
    expect(commands[1]?.input.ContentType).toBe("image/png");
    expect(commands[1]?.input.Body).toBeInstanceOf(Uint8Array);
  });

  test("creates the bucket when RustFS reports it is missing", async () => {
    bucketExists = false;

    const key = await uploadAsset(new File(["data"], "without-extension", { type: "application/octet-stream" }));

    expect(key).toMatch(/^uploads\/[0-9a-f-]+\.bin$/);
    expect(commands.map((command) => command.constructor.name)).toEqual(["HeadBucketCommand", "CreateBucketCommand", "PutObjectCommand"]);
  });

  test("reads an asset from object storage", async () => {
    const result = await readAsset("uploads/profile.png");

    expect(result.ContentType).toBe("image/png");
    expect(await result.Body?.transformToByteArray()).toEqual(new Uint8Array([1, 2, 3]));
    expect(commands[0]?.constructor.name).toBe("GetObjectCommand");
    expect(commands[0]?.input.Key).toBe("uploads/profile.png");
  });
});
