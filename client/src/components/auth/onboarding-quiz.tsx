import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface QuizAnswers {
  // Section 1: Past Experiences
  pastActivities: string[];
  pastActivitiesOther: string;
  volunteered: string;
  volunteerDescription: string;
  pastHobby: string;
  
  // Section 2: Present Interests
  currentInterests: string[];
  currentInterestsOther: string;
  weekendActivities: string[];
  weekendActivitiesOther: string;
  lifestyleParts: string[];
  
  // Section 3: Future Goals
  futureGoal: string;
  futureGoals: string[];
  futureGoalsOther: string;
  dreamCommunity: string;
  
  // Section 4: Personality & Preferences
  groupPreference: string;
  travelDistance: string;
  connectionTypes: string[];
  
  // Section 5: Free Input
  dreamCommunityName: string;
  idealVibe: string;
  personalIntro: string;
}

const sections = [
  { title: "Past Experiences", subtitle: "What shaped your journey?", icon: "🕰️" },
  { title: "Present Passions", subtitle: "What drives you today?", icon: "🧭" },
  { title: "Future Aspirations", subtitle: "Where are you growing?", icon: "🚀" },
  { title: "Connection Style", subtitle: "How do you thrive in community?", icon: "🔍" },
  { title: "Your Third Place Vision", subtitle: "Design your ideal community space", icon: "✍️" }
];

interface OnboardingQuizProps {
  onComplete: () => void;
  onBack?: () => void;
}

export function OnboardingQuiz({ onComplete, onBack }: OnboardingQuizProps) {
  const [currentSection, setCurrentSection] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswers>({
    pastActivities: [],
    pastActivitiesOther: "",
    volunteered: "",
    volunteerDescription: "",
    pastHobby: "",
    currentInterests: [],
    currentInterestsOther: "",
    weekendActivities: [],
    weekendActivitiesOther: "",
    lifestyleParts: [],
    futureGoal: "",
    futureGoals: [],
    futureGoalsOther: "",
    dreamCommunity: "",
    groupPreference: "",
    travelDistance: "",
    connectionTypes: [],
    dreamCommunityName: "",
    idealVibe: "",
    personalIntro: ""
  });
  
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateUserMutation = useMutation({
    mutationFn: async (quizData: QuizAnswers) => {
      if (!user) throw new Error("No user found");
      
      // Extract interests from quiz answers
      const interests = [
        ...answers.pastActivities,
        ...answers.currentInterests,
        ...answers.weekendActivities,
        ...answers.lifestyleParts,
        ...answers.futureGoals,
        ...answers.connectionTypes
      ].filter(Boolean);
      
      const response = await apiRequest('PATCH', `/api/users/${user.id}`, { 
        interests: interests,
        bio: answers.personalIntro || `${answers.idealVibe} | ${answers.dreamCommunity}`.substring(0, 500),
        onboardingCompleted: true,
        quizAnswers: quizData
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: [`/api/users/firebase/${user?.firebaseUid}`] });
      toast({
        title: "Welcome to TriPlace!",
        description: "Your profile is complete. Let's find your community!",
      });
      // Small delay to ensure user data is updated before navigation
      setTimeout(() => {
        onComplete();
      }, 100);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to save your profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleCheckboxChange = (field: keyof QuizAnswers, value: string, checked: boolean) => {
    setAnswers(prev => ({
      ...prev,
      [field]: checked 
        ? [...(prev[field] as string[]), value]
        : (prev[field] as string[]).filter(item => item !== value)
    }));
  };

  const handleTextChange = (field: keyof QuizAnswers, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNext = () => {
    if (currentSection < sections.length - 1) {
      setCurrentSection(prev => prev + 1);
    } else {
      updateUserMutation.mutate(answers);
    }
  };

  const handlePrevious = () => {
    if (currentSection === 0) {
      onBack?.();
    } else {
      setCurrentSection(prev => prev - 1);
    }
  };

  const progressValue = ((currentSection + 1) / sections.length) * 100;

  const renderSection = () => {
    switch (currentSection) {
      case 0: // Past Experiences
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                In the past 12 months, which of these have you participated in?
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  "🏃‍♂️ A race or athletic competition",
                  "🎵 A concert or music festival", 
                  "📚 A book club or reading challenge",
                  "🧘 A mindfulness or wellness retreat",
                  "💼 A networking or professional event",
                  "✈️ A trip to a new city or country",
                  "🎮 An online or in-person gaming event",
                  "🎨 An art show or creative workshop"
                ].map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={option}
                      checked={answers.pastActivities.includes(option)}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange('pastActivities', option, checked as boolean)
                      }
                    />
                    <label htmlFor={option} className="text-sm text-gray-300">{option}</label>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <label className="text-sm text-gray-300 mb-2 block">Other:</label>
                <Textarea
                  value={answers.pastActivitiesOther}
                  onChange={(e) => handleTextChange('pastActivitiesOther', e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Describe any other activities..."
                />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                Have you volunteered or joined any cause-related groups in the past year?
              </h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="volunteered-yes"
                    checked={answers.volunteered === "yes"}
                    onCheckedChange={(checked) => 
                      handleTextChange('volunteered', checked ? 'yes' : '')
                    }
                  />
                  <label htmlFor="volunteered-yes" className="text-sm text-gray-300">Yes</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="volunteered-no"
                    checked={answers.volunteered === "no"}
                    onCheckedChange={(checked) => 
                      handleTextChange('volunteered', checked ? 'no' : '')
                    }
                  />
                  <label htmlFor="volunteered-no" className="text-sm text-gray-300">No</label>
                </div>
                {answers.volunteered === "yes" && (
                  <div className="mt-4">
                    <label className="text-sm text-gray-300 mb-2 block">If yes, describe briefly:</label>
                    <Textarea
                      value={answers.volunteerDescription}
                      onChange={(e) => handleTextChange('volunteerDescription', e.target.value)}
                      className="bg-gray-700 border-gray-600 text-white"
                      placeholder="Tell us about your volunteer experience..."
                    />
                  </div>
                )}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                What is a hobby or activity you used to love but haven't done recently?
              </h3>
              <Textarea
                value={answers.pastHobby}
                onChange={(e) => handleTextChange('pastHobby', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Tell us about something you miss doing..."
              />
            </div>
          </div>
        );

      case 1: // Present Interests
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                Which of these best describe your current hobbies/interests? (Select up to 5)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  "🧘 Wellness & Mental Health",
                  "🧠 Personal Growth",
                  "🎸 Live Music & Concerts",
                  "🍳 Cooking & Food",
                  "🐶 Animals & Pets",
                  "🏞️ Nature & Outdoors",
                  "🎨 Arts & DIY",
                  "🕹️ Gaming",
                  "📚 Reading",
                  "🏋️ Fitness",
                  "🎭 Comedy & Entertainment",
                  "💻 Tech & Startups"
                ].map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={option}
                      checked={answers.currentInterests.includes(option)}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange('currentInterests', option, checked as boolean)
                      }
                      disabled={answers.currentInterests.length >= 5 && !answers.currentInterests.includes(option)}
                    />
                    <label htmlFor={option} className="text-sm text-gray-300">{option}</label>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <label className="text-sm text-gray-300 mb-2 block">Other:</label>
                <Textarea
                  value={answers.currentInterestsOther}
                  onChange={(e) => handleTextChange('currentInterestsOther', e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Any other interests..."
                />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                How do you usually spend your weekends? (Choose up to 3)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  "🎉 Hanging out with friends",
                  "😌 Recharging alone",
                  "🌳 Exploring outdoors",
                  "📺 Watching content",
                  "🧪 Trying something new",
                  "🧑‍🤝‍🧑 Going to events or meetups",
                  "🖥️ Working on personal projects",
                  "✍️ Journaling or learning"
                ].map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={option}
                      checked={answers.weekendActivities.includes(option)}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange('weekendActivities', option, checked as boolean)
                      }
                      disabled={answers.weekendActivities.length >= 3 && !answers.weekendActivities.includes(option)}
                    />
                    <label htmlFor={option} className="text-sm text-gray-300">{option}</label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                Which of these would you consider "core parts" of your lifestyle right now? (Pick 3 max)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  "🏃 Active / On-the-go",
                  "🧘 Balanced / Mindful",
                  "🎨 Creative / Artistic",
                  "🧑‍💻 Driven / Techy",
                  "🎉 Social / Outgoing",
                  "🧑‍🌾 Grounded / Nature-loving",
                  "💬 Curious / Always learning",
                  "🎮 Introverted / Online-centric",
                  "✈️ Adventurous / Spontaneous"
                ].map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={option}
                      checked={answers.lifestyleParts.includes(option)}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange('lifestyleParts', option, checked as boolean)
                      }
                      disabled={answers.lifestyleParts.length >= 3 && !answers.lifestyleParts.includes(option)}
                    />
                    <label htmlFor={option} className="text-sm text-gray-300">{option}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 2: // Future Goals
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                What's something you want to try in the next year?
              </h3>
              <Textarea
                value={answers.futureGoal}
                onChange={(e) => handleTextChange('futureGoal', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Tell us about something you want to explore..."
              />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                Which of these goals best describe what you're working toward? (Select up to 3)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  "🎓 Learn something new",
                  "🧠 Improve my mental health",
                  "🧑‍🤝‍🧑 Meet new people",
                  "🧳 Travel more",
                  "🎯 Build a passion project",
                  "🏃 Get fit or healthier",
                  "💡 Start a side hustle",
                  "🎤 Perform or showcase my talent"
                ].map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={option}
                      checked={answers.futureGoals.includes(option)}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange('futureGoals', option, checked as boolean)
                      }
                      disabled={answers.futureGoals.length >= 3 && !answers.futureGoals.includes(option)}
                    />
                    <label htmlFor={option} className="text-sm text-gray-300">{option}</label>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <label className="text-sm text-gray-300 mb-2 block">Other:</label>
                <Textarea
                  value={answers.futureGoalsOther}
                  onChange={(e) => handleTextChange('futureGoalsOther', e.target.value)}
                  className="bg-gray-700 border-gray-600 text-white"
                  placeholder="Any other goals..."
                />
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                If you could magically join a community of like-minded people today, what would that community be about?
              </h3>
              <Textarea
                value={answers.dreamCommunity}
                onChange={(e) => handleTextChange('dreamCommunity', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="Describe your ideal community..."
              />
            </div>
          </div>
        );

      case 3: // Personality & Preferences
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                Which do you prefer when engaging with a group?
              </h3>
              <div className="space-y-3">
                {[
                  "Small, close-knit conversations",
                  "Large events with energy and variety",
                  "Online-only communities",
                  "A mix of all depending on the day"
                ].map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={option}
                      checked={answers.groupPreference === option}
                      onCheckedChange={(checked) => 
                        handleTextChange('groupPreference', checked ? option : '')
                      }
                    />
                    <label htmlFor={option} className="text-sm text-gray-300">{option}</label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                How far are you willing to travel to attend an event or meet up with community members?
              </h3>
              <div className="space-y-3">
                {[
                  "🚶 Within walking distance",
                  "🚗 Up to 10 miles",
                  "🛣️ Up to 50 miles",
                  "✈️ I'd travel for special experiences",
                  "🌐 Prefer virtual meetups only"
                ].map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={option}
                      checked={answers.travelDistance === option}
                      onCheckedChange={(checked) => 
                        handleTextChange('travelDistance', checked ? option : '')
                      }
                    />
                    <label htmlFor={option} className="text-sm text-gray-300">{option}</label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                What kind of connections are you looking for? (Pick all that apply)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  "👯‍♀️ Friends",
                  "🤝 Collaborators / Project partners",
                  "👨‍👩‍👧 Community / Belonging",
                  "🧠 Learning buddies",
                  "🎯 Mentorship opportunities",
                  "Just want a place to lurk quietly"
                ].map((option) => (
                  <div key={option} className="flex items-center space-x-2">
                    <Checkbox
                      id={option}
                      checked={answers.connectionTypes.includes(option)}
                      onCheckedChange={(checked) => 
                        handleCheckboxChange('connectionTypes', option, checked as boolean)
                      }
                    />
                    <label htmlFor={option} className="text-sm text-gray-300">{option}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 4: // Free Input
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                Name a dream community you wish existed
              </h3>
              <Textarea
                value={answers.dreamCommunityName}
                onChange={(e) => handleTextChange('dreamCommunityName', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="e.g., 'Night Owl Entrepreneurs' or 'Hiking Philosophers'..."
              />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                What would the vibe of your ideal community be?
              </h3>
              <Textarea
                value={answers.idealVibe}
                onChange={(e) => handleTextChange('idealVibe', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="e.g., calm, funny, action-driven, safe space..."
              />
            </div>

            <div>
              <h3 className="text-lg font-semibold text-white mb-4">
                Is there anything you'd want to share with your future community to find the right people?
              </h3>
              <Textarea
                value={answers.personalIntro}
                onChange={(e) => handleTextChange('personalIntro', e.target.value)}
                className="bg-gray-700 border-gray-600 text-white"
                placeholder="e.g., 'I'm into hiking, weird films, and 3am convos about philosophy'..."
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch', height: '100vh' }}>
      <div className="container mx-auto px-4 py-8 max-w-4xl h-full overflow-y-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 text-white">
            🌱 TriPlace Community Matching Quiz
          </h1>
          <p className="text-gray-400 mb-6">
            Help us build communities from your actual life, not just static preferences
          </p>
          <div className="mt-6">
            <Progress value={progressValue} className="w-full h-2" />
            <p className="text-sm text-gray-500 mt-2">
              {sections[currentSection].icon} Section {currentSection + 1} of {sections.length}
            </p>
          </div>
        </div>

        <Card className="bg-gray-800/50 border-gray-700 backdrop-blur-sm mb-8">
          <CardHeader>
            <CardTitle className="text-2xl text-white flex items-center gap-2">
              <span className="text-2xl">{sections[currentSection].icon}</span>
              {sections[currentSection].title}
            </CardTitle>
            <CardDescription className="text-gray-400">
              {sections[currentSection].subtitle}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-8 max-h-[60vh] overflow-y-auto">
            <div className="pb-4">
              {renderSection()}
            </div>
          </CardContent>
          
          {/* Fixed navigation buttons at bottom */}
          <div className="bg-gray-800/50 border-t border-gray-700 p-6">
            <div className="flex justify-between">
              <Button
                onClick={handlePrevious}
                variant="outline"
                className="px-6 py-3 bg-gray-700 hover:bg-gray-600 border-gray-600 text-white"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                {currentSection === 0 ? "Back" : "Previous"}
              </Button>
              <Button
                onClick={handleNext}
                disabled={updateUserMutation.isPending}
                className="px-8 py-3 bg-primary hover:bg-primary/90"
              >
                {updateUserMutation.isPending ? "Saving..." : 
                 currentSection === sections.length - 1 ? "Complete Profile" : "Continue"}
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
