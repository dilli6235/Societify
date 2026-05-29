import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { GateScreen } from '../screens/guard/GateScreen';
import { StaffAttendanceScreen } from '../screens/guard/StaffAttendanceScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();

const icon = (emoji: string) => ({ color }: { color: string }) =>
  <Text style={{ fontSize: 20, color }}>{emoji}</Text>;

export function GuardTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.subtext,
        tabBarStyle: { backgroundColor: colors.card, borderTopColor: colors.border },
        headerStyle: { backgroundColor: colors.card },
        headerTitleStyle: { color: colors.text },
        headerTintColor: colors.text,
      }}
    >
      <Tab.Screen name="Gate" component={GateScreen} options={{ tabBarIcon: icon('🛡️') }} />
      <Tab.Screen name="Staff" component={StaffAttendanceScreen} options={{ tabBarIcon: icon('👷') }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: icon('👤') }} />
    </Tab.Navigator>
  );
}
