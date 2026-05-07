export type NavItemSetting = {
  id: string;
  label: string;
  path: string;
  visible: boolean;
  sortOrder: number;
};

export type PlatformSettings = {
  navItems: NavItemSetting[];
  homeHero: {
    title: string;
    subtitle: string;
  };
  featuredContent: {
    count: number;
    layout: "grid" | "list" | "carousel";
  };
  searchBar: {
    position: "header" | "hidden";
  };
  moderation: {
    autoModeration: boolean;
    blockedKeywords: string[];
    approveFirstUpload: boolean;
    approveMultipleLinks: boolean;
  };
  social: {
    twitter: { enabled: boolean };
    facebook: { enabled: boolean };
    instagram: { enabled: boolean };
    linkedin: { enabled: boolean };
    youtube: { enabled: boolean };
  };
  featuredSections: {
    articles: boolean;
    videos: boolean;
    podcasts: boolean;
    pills: boolean;
    courses: boolean;
  };
};

export type CmsNavLink = {
  label: string;
  href: string;
};
