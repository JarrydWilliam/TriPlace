// Quick test to verify ChatGPT integration
const { aiMatcher } = require('./server/ai-matching.js');

async function testChatGPT() {
  console.log('Testing ChatGPT integration...');
  
  // Mock user data with quiz responses
  const mockUsers = [
    {
      id: 1,
      name: 'Test User',
      email: 'test@example.com',
      interests: ['fitness', 'cooking', 'reading'],
      quizAnswers: JSON.stringify({
        pastActivities: ['sports', 'volunteering'],
        currentInterests: ['fitness', 'cooking'],
        futureGoals: ['health', 'community building'],
        connectionTypes: ['in-person', 'activity-based'],
        groupPreference: 'small groups',
        idealVibe: 'supportive and encouraging'
      })
    }
  ];

  const userLocation = { lat: 40.7128, lon: -74.0060 }; // NYC

  try {
    const communities = await aiMatcher.generateDynamicCommunities(mockUsers, userLocation);
    console.log(`Generated ${communities.length} communities:`);
    communities.forEach((community, index) => {
      console.log(`${index + 1}. ${community.name} (${community.category})`);
      console.log(`   Description: ${community.description}`);
      console.log(`   Reasoning: ${community.reasoning}`);
      console.log('');
    });
    
    if (communities.length === 5) {
      console.log('✅ SUCCESS: ChatGPT generated exactly 5 communities!');
    } else {
      console.log(`❌ ERROR: Expected 5 communities, got ${communities.length}`);
    }
  } catch (error) {
    console.error('❌ ERROR:', error.message);
  }
}

testChatGPT();