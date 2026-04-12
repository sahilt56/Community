import { Users, Pencil, MessageSquare, Flame, Shield, Award, Beaker, Globe, Sparkles } from 'lucide-react';

export const featuresData = [
  {
    id: 'communities',
    title: 'Dynamic Communities',
    description: 'Create or join specialized groups (Vishwa) tailored to your interests. Manage your own space or contribute to others.',
    icon: Users,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    useCase: 'Students sharing notes, hobbyists discussing niches, or professionals networking.'
  },
  {
    id: 'content-sharing',
    title: 'Rich Content sharing',
    description: 'Share your thoughts with support for Markdown, images, and videos. Express yourself exactly how you want.',
    icon: Pencil,
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
    useCase: 'Posting tutorials, sharing event photos, or writing detailed articles.'
  },
  {
    id: 'chat-rooms',
    title: 'Real-time Chat',
    description: 'Instant communication with community members through dedicated chat rooms and private messaging.',
    icon: MessageSquare,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    useCase: 'Quick help, live event discussions, or casual hanging out.'
  },
  {
    id: 'anubhav-system',
    title: 'Anubhav (XP) System',
    description: 'A robust gamification system. Earn Anubhav through contributions and level up your profile status.',
    icon: Flame,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    useCase: 'Recognizing active contributors and building trust within the platform.'
  },
  {
    id: 'official-badges',
    title: 'Badges & Recognition',
    description: 'Earn official Vartalap badges, Centurion status for milestones, and Beta Tester recognition.',
    icon: Award,
    color: 'text-teal-500',
    bgColor: 'bg-teal-500/10',
    useCase: 'Establishing credibility and highlighting dedicated community members.'
  },
  {
    id: 'admin-supervision',
    title: 'Safe Environment',
    description: 'Powerful moderation tools and admin supervision ensuring a healthy, spam-free community.',
    icon: Shield,
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10',
    useCase: 'Filtering harmful content and maintaining community standards.'
  }
];

export const platformStats = {
  mission: "Vartalap is built to foster meaningful conversations and build local communities that matter. We believe in the power of shared knowledge and mutual growth.",
  vision: "To become the primary hub for Indian students and professionals to connect, learn, and share without barriers.",
  communityCount: 'Growing...',
  userCount: 'Vibrant'
};
