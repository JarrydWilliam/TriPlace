
import { spawn } from "child_process";
import path from "path";
import { db } from "../server/db";
import { users, communities, posts } from "@shared/schema";
import { eq } from "drizzle-orm";

const PORT = 5001; // Use a different port for testing if possible, or just default 5000
const API_URL = `http://localhost:${PORT}`;

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function verifyAll() {
  console.log("🚀 Starting Verification Suite...");

  // 1. Start Server
  // 1. Start Server
  console.log("Starting server...");
  // Use local tsx.cmd if available, or just node with tsx loader
  const tsxPath = path.resolve("node_modules", ".bin", "tsx.cmd");
  const server = spawn(tsxPath, ["server/index.ts"], {
    env: { ...process.env, PORT: PORT.toString(), NODE_ENV: "development" },
    stdio: "pipe"
  });

  server.stdout.on('data', (data) => {
    // console.log(`[Server]: ${data}`); // Uncomment for debug
  });

  // Wait for server to be ready
  let serverReady = false;
  for (let i = 0; i < 30; i++) {
    try {
      await fetch(`${API_URL}/api/health`).catch(() => {}); // or any route
      // Actually /api/health might not exist, try fetching index
      const res = await fetch(API_URL).catch(() => null);
      if (res && res.status < 500) {
        serverReady = true;
        break;
      }
    } catch (e) {}
    await sleep(1000);
  }

  if (!serverReady) {
    console.error("❌ Server failed to start.");
    server.kill();
    process.exit(1);
  }
  console.log("✅ Server is up!");

  try {
    // 2. Setup Test Data
    const testUsername = `testuser_${Date.now()}`;
    const testPassword = "password123";
    let cookie = "";
    let userId = 0;

    // 3. Test Authentication
    console.log("\n👤 Testing Authentication...");
    
    // Register
    const regRes = await fetch(`${API_URL}/api/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: testUsername, password: testPassword })
    });

    if (regRes.status !== 201 && regRes.status !== 200) {
      throw new Error(`Registration failed: ${regRes.status}`);
    }
    const regData = await regRes.json();
    userId = regData.id || regData.user.id;
    console.log("✅ Registration successful");

    // Login
    const loginRes = await fetch(`${API_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: testUsername, password: testPassword })
    });
    
    if (loginRes.status !== 200) throw new Error("Login failed");
    // Extract cookie
    const setCookie = loginRes.headers.get("set-cookie");
    if (setCookie) cookie = setCookie;
    console.log("✅ Login successful");

    // 4. Test Community & Moderation
    console.log("\n💬 Testing Community & Moderation...");
    
    // Ensure a community exists
    let communityId = 1;
    const [existingComm] = await db.select().from(communities).limit(1);
    if (existingComm) {
      communityId = existingComm.id;
    } else {
      const [newComm] = await db.insert(communities).values({
        name: "Test Community",
        description: "For testing",
        slug: "test-community",
        platform: "other"
      }).returning();
      communityId = newComm.id;
    }

    // Post Creation (Safe)
    const postRes = await fetch(`${API_URL}/api/communities/${communityId}/posts`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Cookie": cookie
      },
      body: JSON.stringify({ authorId: userId, content: "Hello world! This is a safe post." })
    });

    if (postRes.status !== 201) throw new Error(`Safe post creation failed: ${postRes.status}`);
    console.log("✅ Safe post created");

    // Post Creation (Toxic)
    const toxicRes = await fetch(`${API_URL}/api/communities/${communityId}/posts`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Cookie": cookie
      },
      body: JSON.stringify({ authorId: userId, content: "I hate everyone and want to kill." })
    });

    if (toxicRes.status === 400) {
      console.log("✅ Toxic post correctly blocked");
    } else {
      throw new Error(`Toxic post SHOULD have failed but got ${toxicRes.status}`);
    }

    // 5. Test AI Agent
    console.log("\n🤖 Testing AI Agent...");
    
    // Trigger agent run
    const agentRes = await fetch(`${API_URL}/api/agent/run/${userId}`, {
      method: "POST",
      headers: { "Cookie": cookie }
    });

    if (agentRes.status !== 200) throw new Error("Agent run failed");
    const agentData = await agentRes.json();
    console.log("Agent Data:", JSON.stringify(agentData, null, 2));
    console.log("✅ Agent run successful");

    console.log("\n🎉 ALL TESTS PASSED!");

  } catch (err) {
    console.error("\n❌ Test Failed:", err);
  } finally {
    // Cleanup
    server.kill();
    process.exit(0);
  }
}

verifyAll();
