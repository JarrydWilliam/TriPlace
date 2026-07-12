const fs = require('fs');

let content = fs.readFileSync('server/routes.ts', 'utf8');

// Insert requireAuth
const requireAuthCode = `  const requireAuth = async (req: any, res: any, next: any) => {
    const { getAdminApp } = await import("./utils/firebase-admin.js");
    const adminApp = getAdminApp();
    if (!adminApp) {
      console.warn('[SameVibe] Auth bypassed: Firebase Admin is not configured. Trusting client.');
      return next(); 
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ message: "Missing or invalid Authorization header." });
    }

    const idToken = authHeader.split('Bearer ')[1];
    try {
      const decodedToken = await adminApp.auth().verifyIdToken(idToken);
      req.firebaseUser = decodedToken;
      next();
    } catch (error) {
      console.error('[SameVibe] verifyIdToken error:', error);
      return res.status(401).json({ message: "Invalid or expired authentication token." });
    }
  };
`;

if (!content.includes('const requireAuth =')) {
  content = content.replace('  // Telemetry routes', requireAuthCode + '\n  // Telemetry routes');
}

// Endpoints to secure
const endpoints = [
  "app.post(\"/api/users\", ",
  "app.patch(\"/api/users/:id\", ",
  "app.delete(\"/api/users/:id\", ",
  "app.post(\"/api/users/:id/connection-signal\", ",
  "app.post(\"/api/checkout/verify-revenuecat\", ",
  "app.post(\"/api/communities\", ",
  "app.post(\"/api/communities/:id/join\", ",
  "app.post(\"/api/communities/:id/activity\", ",
  "app.patch(\"/api/users/current/location\", ",
  "app.post(\"/api/communities/:id/leave\", ",
  "app.post(\"/api/events\", ",
  "app.post(\"/api/events/:id/register\", ",
  "app.post(\"/api/events/:id/review\", ",
  "app.post(\"/api/users/block\", ",
  "app.post(\"/api/users/:id/report\", ",
  "app.post(\"/api/events/:id/report\", ",
  "app.post(\"/api/events/create-global\", ",
  "app.post(\"/api/messages\", ",
  "app.patch(\"/api/messages/:id/read\", ",
  "app.post(\"/api/kudos\", ",
  "app.post(\"/api/communities/:id/scrape-events\", ",
  "app.post(\"/api/communities/:id/events\", ",
  "app.post(\"/api/events/:id/mark-attended\", ",
  "app.post(\"/api/communities/:id/messages\", ",
  "app.post(\"/api/users/:id/activity\", ",
  "app.post(\"/api/users/:id/status\", ",
  "app.post(\"/api/onboarding/complete\", ",
  "app.post(\"/api/communities/:id/posts\", ",
  "app.post(\"/api/posts/:id/kudos\", ",
  "app.post(\"/api/users/:id/checkin\", "
];

for (const ep of endpoints) {
  // Regex to match e.g. `app.post("/api/users", async` or `app.post("/api/users", upload.single, async`
  // and replace with `app.post("/api/users", requireAuth, async`
  const searchStr = ep + "async";
  const replaceStr = ep + "requireAuth, async";
  content = content.replace(searchStr, replaceStr);
}

// Remove test routes completely
const routesToRemove = [
  "app.get(\"/api/communities/seed\",",
  "app.post(\"/api/communities/:id/populate-sample-events\","
];

routesToRemove.forEach(route => {
  const index = content.indexOf(route);
  if (index !== -1) {
    let bracketCount = 0;
    let endIndex = index;
    let started = false;
    for (let i = index; i < content.length; i++) {
      if (content[i] === '{') {
        bracketCount++;
        started = true;
      }
      if (content[i] === '}') {
        bracketCount--;
      }
      if (started && bracketCount === 0) {
        // Also look for the closing parenthesis and semicolon `});`
        endIndex = content.indexOf(';', i);
        if (endIndex === -1) endIndex = i + 1;
        break;
      }
    }
    content = content.slice(0, index) + "\n  // [REMOVED TEST ROUTE IN PROD]\n" + content.slice(endIndex + 1);
  }
});

fs.writeFileSync('server/routes.ts', content, 'utf8');
console.log("Done");
