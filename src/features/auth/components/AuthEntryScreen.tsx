import { useEffect } from 'react';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import { ForgotPasswordScreen } from './ForgotPasswordScreen';
import { LoginScreen } from './LoginScreen';
import { RegisterScreen } from './RegisterScreen';
import { useAuth } from '../state/useAuth';
import { RootStackParamList } from '../../../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'AuthEntry'>;

export function AuthEntryScreen({ route }: Props) {
  const { authView, setAuthView } = useAuth();
  const requestedView = route.params?.view;

  useEffect(() => {
    if (!requestedView || requestedView === authView) {
      return;
    }

    setAuthView(requestedView);
  }, [authView, requestedView, setAuthView]);

  if (authView === 'REGISTER') {
    return <RegisterScreen />;
  }

  if (authView === 'FORGOT_PASSWORD') {
    return <ForgotPasswordScreen />;
  }

  return <LoginScreen />;
}
