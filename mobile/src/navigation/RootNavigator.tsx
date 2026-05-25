import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { LoginScreen } from '../screens/LoginScreen';
import { ResidentTabs } from './ResidentTabs';
import { GuardTabs } from './GuardTabs';
import { colors } from '../theme';

export function RootNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg }}>
        <ActivityIndicator size="large" color={colors.brand} />
      </View>
    );
  }

  if (!user) return <LoginScreen />;

  // Security guards get the gate-operations app; everyone else the resident app.
  return user.roles.includes('SECURITY_GUARD') ? <GuardTabs /> : <ResidentTabs />;
}
