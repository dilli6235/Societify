import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NoticesScreen } from '../screens/resident/NoticesScreen';
import { VisitorsScreen } from '../screens/resident/VisitorsScreen';
import { ComplaintsScreen } from '../screens/resident/ComplaintsScreen';
import { BillingScreen } from '../screens/resident/BillingScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { colors } from '../theme';

const Tab = createBottomTabNavigator();

const icon = (emoji: string) => ({ color }: { color: string }) =>
  <Text style={{ fontSize: 20, color }}>{emoji}</Text>;

export function ResidentTabs() {
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
      <Tab.Screen name="Notices" component={NoticesScreen} options={{ tabBarIcon: icon('📢') }} />
      <Tab.Screen name="Dues" component={BillingScreen} options={{ tabBarIcon: icon('🧾') }} />
      <Tab.Screen name="Visitors" component={VisitorsScreen} options={{ tabBarIcon: icon('🚶') }} />
      <Tab.Screen name="Complaints" component={ComplaintsScreen} options={{ tabBarIcon: icon('🛠️') }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: icon('👤') }} />
    </Tab.Navigator>
  );
}
