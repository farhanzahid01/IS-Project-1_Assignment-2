import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Svg, { Circle, Path } from 'react-native-svg';
import { GoalProvider, useGoal } from './src/context/GoalContext';
import { OnboardingScreen } from './src/screens/OnboardingScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { NutritionScreen } from './src/screens/NutritionScreen';
import { ActivityScreen } from './src/screens/ActivityScreen';
import { ChallengesScreen } from './src/screens/ChallengesScreen';
import { theme } from './src/theme';

const navTheme = {
  ...DefaultTheme,
  dark: true,
  colors: {
    ...DefaultTheme.colors,
    background: theme.colors.bg,
    card: theme.colors.surface,
    border: theme.colors.border,
    primary: theme.colors.accent,
    text: theme.colors.text,
    notification: theme.colors.accent,
  },
};

const Tabs = createBottomTabNavigator();

function TabIcon({ name, color }: { name: string; color: string }) {
  const size = 22;
  const stroke = color;
  switch (name) {
    case 'Dashboard':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M3 11l9-7 9 7v9a2 2 0 01-2 2h-4v-6h-6v6H5a2 2 0 01-2-2v-9z" stroke={stroke} strokeWidth={1.8} strokeLinejoin="round" />
        </Svg>
      );
    case 'Nutrition':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M12 2c4 0 7 3 7 7 0 6-4 13-7 13S5 15 5 9c0-4 3-7 7-7z" stroke={stroke} strokeWidth={1.8} />
          <Path d="M12 2v13" stroke={stroke} strokeWidth={1.8} />
        </Svg>
      );
    case 'Activity':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M3 12h4l3-8 4 16 3-8h4" stroke={stroke} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'Challenges':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="8" r="5" stroke={stroke} strokeWidth={1.8} />
          <Path d="M8 12l-2 9 6-4 6 4-2-9" stroke={stroke} strokeWidth={1.8} strokeLinejoin="round" />
        </Svg>
      );
    default:
      return null;
  }
}

function AppShell() {
  const { goal, loading } = useGoal();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  if (!goal) {
    return <OnboardingScreen />;
  }

  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          height: 64,
          paddingTop: 6,
          paddingBottom: 10,
        },
        tabBarIcon: ({ color }) => <TabIcon name={route.name} color={color} />,
      })}
    >
      <Tabs.Screen name="Dashboard" component={DashboardScreen} />
      <Tabs.Screen name="Nutrition" component={NutritionScreen} />
      <Tabs.Screen name="Activity" component={ActivityScreen} />
      <Tabs.Screen name="Challenges" component={ChallengesScreen} />
    </Tabs.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <NavigationContainer theme={navTheme}>
        <GoalProvider>
          <AppShell />
        </GoalProvider>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, backgroundColor: theme.colors.bg, justifyContent: 'center', alignItems: 'center' },
});
