import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ipv6ClusterHash, ipv4ClusterHash } from "../workers/safe-chat/src/child-safety-abuse.js";

describe("cluster hash", () => {
  it("hashes IPv4 /24", async () => {
    const a = await ipv4ClusterHash("203.0.113.50", "salt");
    const b = await ipv4ClusterHash("203.0.113.99", "salt");
    assert.equal(a, b);
  });

  it("hashes IPv6 /64", async () => {
    const a = await ipv6ClusterHash("2001:db8::1", "salt");
    const b = await ipv6ClusterHash("2001:db8:0:0:0:0:0:2", "salt");
    assert.equal(a, b);
    assert.notEqual(a, await ipv4ClusterHash("203.0.113.1", "salt"));
  });
});
