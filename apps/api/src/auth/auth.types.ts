export type SessionUser = {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
};

export type RegisterInput = {
  email: string;
  username: string;
  password: string;
  displayName: string;
  organizationName?: string;
};

export type LoginInput = {
  login: string;
  password: string;
};
