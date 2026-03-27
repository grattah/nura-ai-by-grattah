// Dummy data for Nura Health & Wellness App
// This file provides placeholder data that can be easily replaced with real Supabase data

export interface User {
  id: string
  name: string
  email: string
  avatarUrl?: string
}

export interface Recipe {
  id: string
  title: string
  description: string
  ingredients: string[]
  instructions: string[]
  tips?: string
  imageUrl?: string
  category: string
  bodyParts?: string[]
  causes?: string[]
  symptoms?: string[]
}

export interface Category {
  id: string
  title: string
  imageUrl?: string
  recipeCount?: number
}

export interface Notification {
  id: string
  title: string
  message: string
  timestamp: string
  isRead: boolean
}

export interface CancerRisk {
  id: string
  title: string
  description: string
  level: 1 | 2 | 3
  risk: 'high' | 'medium' | 'low'
  cancerType: string
  risksFrom: string
  imageUrl?: string
}

export interface FollowUpQuestion {
  id: string
  question: string
}

// Dummy user
export const dummyUser: User = {
  id: '1',
  name: 'Franklin Philips',
  email: 'franklin@example.com',
}

// Dummy recipes
export const dummyRecipes: Recipe[] = [
  {
    id: '1',
    title: 'Healthy Juice Cleanses',
    description: 'The body naturally detoxifies itself constantly via the liver, kidneys, lungs, intestines, and skin.',
    ingredients: [
      '1 cup spinach',
      'Half cucumber',
      '1 green apple',
      'Half lemon (juice)',
      'Fresh mint leaves',
      'Half cup coconut water',
    ],
    instructions: [
      'Wash Thoroughly',
      'Prep Produce',
      'Juice Order',
      'Storage',
    ],
    tips: 'Maximize nutrient retention by using a Hurom juicer. Our patented Slow Squeeze Technology means all your nutrients get inside your glass of juice – and not in the pulp collector.',
    imageUrl: '/placeholder.svg?height=200&width=400',
    category: 'detoxing',
    bodyParts: ['Liver', 'Kidneys', 'Skin'],
    causes: ['Poor diet', 'Environmental toxins'],
    symptoms: ['Fatigue', 'Bloating', 'Skin issues'],
  },
  {
    id: '2',
    title: 'Body Detox',
    description: 'A refreshing green juice to help cleanse your body.',
    ingredients: [
      '1 green apple',
      'Half lemon (juice)',
      '1 cup spinach',
    ],
    instructions: [
      'Wash all ingredients',
      'Cut into small pieces',
      'Blend until smooth',
      'Serve immediately',
    ],
    imageUrl: '/placeholder.svg?height=200&width=400',
    category: 'detoxing',
  },
  {
    id: '3',
    title: 'Heart Health Smoothie',
    description: 'A heart-healthy blend packed with antioxidants.',
    ingredients: [
      '1 cup blueberries',
      'Half banana',
      '1 tbsp flaxseed',
    ],
    instructions: [
      'Add all ingredients to blender',
      'Blend for 2 minutes',
      'Pour and enjoy',
    ],
    imageUrl: '/placeholder.svg?height=200&width=400',
    category: 'heart',
  },
  {
    id: '4',
    title: 'Weight Management Tea',
    description: 'A metabolism-boosting tea blend.',
    ingredients: [
      'Green tea leaves',
      'Fresh ginger',
      'Honey to taste',
    ],
    instructions: [
      'Boil water',
      'Steep tea and ginger',
      'Add honey',
      'Serve warm',
    ],
    imageUrl: '/placeholder.svg?height=200&width=400',
    category: 'weight',
  },
]

// Dummy categories
export const dummyCategories: Category[] = [
  { id: '1', title: 'Heart Health', recipeCount: 12 },
  { id: '2', title: 'Weight Management', recipeCount: 8 },
  { id: '3', title: 'Liver/Kidney', recipeCount: 15 },
  { id: '4', title: 'Detoxing', recipeCount: 20 },
  { id: '5', title: 'Immunity', recipeCount: 10 },
  { id: '6', title: 'Energy Boost', recipeCount: 7 },
]

// Dummy notifications
export const dummyNotifications: Notification[] = [
  {
    id: '1',
    title: 'Notification Title',
    message: 'Maximize nutrient retention by using a Hurom juicer. Our patented Slow Squeeze Technology means all your nutrients get inside your glass of juice – and not in the pulp collector.',
    timestamp: 'Mar 10, 2026 | 04:26PM',
    isRead: false,
  },
  {
    id: '2',
    title: 'Notification Title',
    message: 'Maximize nutrient retention by using a Hurom juicer. Our patented Slow Squeeze Technology means all your',
    timestamp: 'Mar 10, 2026 | 04:26PM',
    isRead: true,
  },
  {
    id: '3',
    title: 'Notification Title',
    message: 'Maximize nutrient retention by using a Hurom juicer. Our patented Slow Squeeze Technology means all your',
    timestamp: 'Mar 10, 2026 | 04:26PM',
    isRead: true,
  },
]

// Dummy cancer risks
export const dummyCancerRisks: CancerRisk[] = [
  {
    id: '1',
    title: 'Plastic Food Container',
    description: 'Effect and cancer type description here...',
    level: 1,
    risk: 'high',
    cancerType: 'Breast / Lungs',
    risksFrom: 'Daily Spray / Enclosed Spaces',
  },
  {
    id: '2',
    title: 'Air Fresheners',
    description: 'Effect and cancer type description here...',
    level: 3,
    risk: 'low',
    cancerType: 'Breast / Lungs',
    risksFrom: 'Daily Spray / Enclosed Spaces',
  },
  {
    id: '3',
    title: 'Processed Meats',
    description: 'Effect and cancer type description here...',
    level: 2,
    risk: 'medium',
    cancerType: 'Breast / Lungs',
    risksFrom: 'Daily Spray / Enclosed Spaces',
  },
  {
    id: '4',
    title: 'Non-Stick Pans',
    description: 'Effect and cancer type description here...',
    level: 3,
    risk: 'low',
    cancerType: 'Breast / Lungs',
    risksFrom: 'Daily Spray / Enclosed Spaces',
  },
]

// Dummy follow-up questions
export const dummyFollowUpQuestions: FollowUpQuestion[] = [
  { id: '1', question: 'Does my body actually need a detox?' },
  { id: '2', question: 'How long will the detox take and is it sustainable?' },
  { id: '3', question: 'Are specialized detox diets or cleanses safe for me?' },
  { id: '4', question: 'What are the best foods to include in a detox diet?' },
]

// Dummy bookmarks (using recipe IDs)
export const dummyBookmarks: string[] = ['1', '2', '3']

// Helper functions to simulate data fetching
export function getRecipeById(id: string): Recipe | undefined {
  return dummyRecipes.find(recipe => recipe.id === id)
}

export function getRecipesByCategory(category: string): Recipe[] {
  if (category === 'all') return dummyRecipes
  return dummyRecipes.filter(recipe => recipe.category === category)
}

export function getBookmarkedRecipes(): Recipe[] {
  return dummyRecipes.filter(recipe => dummyBookmarks.includes(recipe.id))
}
