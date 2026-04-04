export interface UserDto {
  id: string;
  email: string;
  displayName: string;
  subscriptionTier?: 'FREE' | 'PRO';
}

export interface SessionResponse {
  authenticated: true;
  user: UserDto;
}

export interface StartAuthRequest {
  email: string;
}

export interface StartAuthResponse {
  status: 'EMAIL_SENT';
  maskedEmail: string;
  nextAllowedResendAt?: string | null;
}

export interface VerifyLinkRequest {
  token: string;
}

export interface VerifyCodeRequest {
  email: string;
  code: string;
}

export interface AuthenticatedResponse {
  status: 'AUTHENTICATED';
  user: UserDto;
}

export interface LogoutResponse {
  status: 'SIGNED_OUT';
}
