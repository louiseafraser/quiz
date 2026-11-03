/* Content from the approved SPDS brief. */
const results = {
  "EX": {
    "title": "The Curious Explorer",
    "summary": "Your curiosity drives you to discover, investigate and turn new knowledge into valuable insights.",
    "color": "var(--colour-ex)"
  },
  "PP": {
    "title": "The Practical Pioneer",
    "summary": "You learn by getting stuck in, experimenting with new ideas and turning knowledge into action.",
    "color": "var(--colour-pp)"
  },
  "CC": {
    "title": "The Collaborative Connector",
    "summary": "You thrive on sharing ideas, learning from others and bringing people together to grow.",
    "color": "var(--colour-cc)"
  },
  "RT": {
    "title": "The Reflective Thinker",
    "summary": "You turn experiences into valuable insights through thoughtful reflection and considered decisions.",
    "color": "var(--colour-rt)"
  },
  "SA": {
    "title": "The Strategic Achiever",
    "summary": "You turn ambition into achievement through clear goals, focused development and steady progress.",
    "color": "var(--colour-sa)"
  },
  "CH": {
    "title": "The Creative Challenger",
    "summary": "You question the conventional, explore possibilities and find innovative ways to move forward.",
    "color": "var(--colour-ch)"
  }
};
const questions = [
  {
    "text": "You've been asked to learn a completely new system at work. What's your first move?",
    "answers": [
      {
        "main": "PP",
        "text": "Open it up and have a go — I'll figure it out as I go along."
      },
      {
        "main": "EX",
        "text": "Find out what it can do, how it works and why we're using it."
      },
      {
        "main": "SA",
        "text": "Look for a training guide and work through the steps."
      },
      {
        "main": "CC",
        "text": "Ask a colleague to show me their favourite features."
      },
      {
        "main": "RT",
        "text": "Consider how it fits into our existing processes before diving in."
      },
      {
        "main": "CH",
        "text": "Explore whether it could help us do things in a completely new way."
      }
    ]
  },
  {
    "text": "You've got a free afternoon for professional development. How do you spend it?",
    "answers": [
      {
        "main": "CC",
        "text": "Attend a workshop where I can swap experiences with others."
      },
      {
        "main": "PP",
        "text": "Try an unfamiliar tool or skill through a practical challenge."
      },
      {
        "main": "EX",
        "text": "Explore a subject I've always wanted to know more about."
      },
      {
        "main": "RT",
        "text": "Take some time to review my progress and identify what I've learned."
      },
      {
        "main": "CH",
        "text": "Join a session exploring emerging trends and exciting new ideas."
      },
      {
        "main": "SA",
        "text": "Make progress towards a qualification or development goal."
      }
    ]
  },
  {
    "text": "Something you've tried at work hasn't quite gone to plan. What happens next?",
    "answers": [
      {
        "main": "RT",
        "text": "Review what happened and identify lessons for next time."
      },
      {
        "main": "SA",
        "text": "Break the problem into smaller, more manageable steps."
      },
      {
        "main": "EX",
        "text": "Investigate what went wrong and gather more information."
      },
      {
        "main": "PP",
        "text": "Try another approach and see if it works better."
      },
      {
        "main": "CC",
        "text": "Ask colleagues for their perspectives and suggestions."
      },
      {
        "main": "CH",
        "text": "Question whether the original approach was right in the first place."
      }
    ]
  },
  {
    "text": "Your organisation is introducing AI tools. What's your reaction?",
    "answers": [
      {
        "main": "CH",
        "text": "I'm interested in how AI might completely transform the way we work."
      },
      {
        "main": "EX",
        "text": "I'd like to understand the technology, its capabilities and limitations."
      },
      {
        "main": "PP",
        "text": "I'd prefer to see some practical examples before deciding how to use it."
      },
      {
        "main": "CC",
        "text": "I'd want to talk with colleagues about the opportunities and concerns."
      },
      {
        "main": "RT",
        "text": "I'd think carefully about the implications, including ethics and risks."
      },
      {
        "main": "SA",
        "text": "I'd look for a structured way to build my AI skills and confidence."
      }
    ]
  },
  {
    "text": "You're attending a conference. Which session catches your eye?",
    "answers": [
      {
        "main": "SA",
        "text": "\"From Beginner to Expert: Mapping Your Development Journey\""
      },
      {
        "main": "CH",
        "text": "\"The Big Ideas That Could Change Everything\""
      },
      {
        "main": "EX",
        "text": "\"What the Evidence Tells Us About the Future of Work\""
      },
      {
        "main": "RT",
        "text": "\"Learning from Experience: What Worked and What Didn't\""
      },
      {
        "main": "CC",
        "text": "\"Let's Talk: Sharing Challenges and Solutions\""
      },
      {
        "main": "PP",
        "text": "\"Roll Up Your Sleeves: A Practical Skills Workshop\""
      }
    ]
  },
  {
    "text": "You've been given a challenging new project. What excites you most?",
    "answers": [
      {
        "main": "CC",
        "text": "Working with people who bring different experiences and expertise."
      },
      {
        "main": "EX",
        "text": "The opportunity to explore information and uncover something new."
      },
      {
        "main": "CH",
        "text": "Finding an original solution nobody has tried before."
      },
      {
        "main": "SA",
        "text": "Having a clear objective and working towards a successful outcome."
      },
      {
        "main": "PP",
        "text": "Getting stuck in and seeing tangible progress."
      },
      {
        "main": "RT",
        "text": "Understanding the bigger picture and making considered decisions."
      }
    ]
  },
  {
    "text": "What's your ideal way to develop a new workplace skill?",
    "answers": [
      {
        "main": "SA",
        "text": "Following a programme with clear milestones and achievements."
      },
      {
        "main": "RT",
        "text": "Taking time to observe, practise thoughtfully and reflect on progress."
      },
      {
        "main": "CC",
        "text": "Learning alongside a mentor, colleague or supportive group."
      },
      {
        "main": "CH",
        "text": "Experimenting with different approaches and developing my own method."
      },
      {
        "main": "EX",
        "text": "Finding useful resources and exploring the subject in depth."
      },
      {
        "main": "PP",
        "text": "Trying it out in a real-world situation and learning as I go."
      }
    ]
  },
  {
    "text": "A colleague asks for your help with something they've never done before. How do you approach it?",
    "answers": [
      {
        "main": "PP",
        "text": "Encourage them to try it while I guide them through."
      },
      {
        "main": "CH",
        "text": "Help them look at the challenge from a different angle."
      },
      {
        "main": "EX",
        "text": "Give them useful resources and explain where to find answers."
      },
      {
        "main": "CC",
        "text": "Talk it through together and share what has worked for me."
      },
      {
        "main": "SA",
        "text": "Help them create a manageable plan with clear next steps."
      },
      {
        "main": "RT",
        "text": "Ask questions to help them think through the problem themselves."
      }
    ]
  },
  {
    "text": "Imagine you could add one special feature to your workplace. What would you choose?",
    "answers": [
      {
        "main": "CC",
        "text": "A place to exchange skills and knowledge with colleagues across the organisation."
      },
      {
        "main": "SA",
        "text": "A personalised development dashboard showing goals and progress."
      },
      {
        "main": "RT",
        "text": "A quiet space for reflection, feedback and thinking things through."
      },
      {
        "main": "CH",
        "text": "An innovation lab where people can develop and test bold ideas."
      },
      {
        "main": "EX",
        "text": "A discovery hub packed with research, insights and interesting resources."
      },
      {
        "main": "PP",
        "text": "A hands-on learning space where people can experiment with new tools."
      }
    ]
  },
  {
    "text": "It's 2035, and you're looking back on your career. What would make you feel most proud?",
    "answers": [
      {
        "main": "EX",
        "text": "I've continued discovering new things and expanding my knowledge."
      },
      {
        "main": "CC",
        "text": "I've helped others develop their confidence, skills and careers."
      },
      {
        "main": "SA",
        "text": "I've achieved meaningful goals and continually developed my expertise."
      },
      {
        "main": "PP",
        "text": "I've embraced challenges and built skills I never imagined I'd have."
      },
      {
        "main": "CH",
        "text": "I've helped introduce new ideas that changed things for the better."
      },
      {
        "main": "RT",
        "text": "I've learned from my experiences and used those lessons to make a difference."
      }
    ]
  }
];
if (typeof module !== "undefined") module.exports = {results, questions};
