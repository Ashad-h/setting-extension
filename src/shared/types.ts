export interface LinkedInProfile {
  person?: {
    skills?: string[];
    premium?: boolean;
    schools?: {
      educationsCount: number;
      educationHistory?: {
        degreeName?: string;
        schoolLogo?: string;
        schoolName?: string;
        description?: string;
        fieldOfStudy?: string;
        startEndDate?: {
          start?: { year: number; month: number };
          end?: { year: number; month: number };
        };
        duration?: string;
        institution?: string; // Mapped from schoolName
        degree?: string; // Mapped from degreeName
        field?: string; // Mapped from fieldOfStudy
        startDate?: string | Date; // Mapped from startEndDate
        endDate?: string | Date; // Mapped from startEndDate
      }[];
    };
    summary?: string;
    headline?: string;
    lastName?: string;
    firstName?: string;
    location?: string; // Mapped from location object or string
    photoUrl?: string;
    positions?: {
      positionsCount: number;
      positionHistory?: {
        title?: string;
        companyName?: string;
        companyLogo?: string;
        description?: string;
        companyLocation?: string;
        contractType?: string;
        startEndDate?: {
          start?: { year: number; month: number };
          end?: { year: number; month: number };
        };
        duration?: string;
        company?: string; // Mapped from companyName
        startDate?: string | Date; // Mapped from startEndDate
        endDate?: string | Date; // Mapped from startEndDate
      }[];
    };
    connections?: number; // Derived or mocked
  };
  company?: {
    name: string;
    logo?: string;
    description?: string;
    industry?: string;
    employeeCountRange?: { start: number; end?: number };
  };
}

// Flattened profile structure for the UI component based on the user's example component
export interface FlattenedProfile {
  fullName: string;
  headline?: string;
  profileImageUrl?: string;
  url: string;
  location?: string;
  connections?: number;
  summary?: string;
  experience?: {
    title?: string;
    company: string;
    companyLogo?: string;
    companyLocation?: string;
    startDate?: Date | string;
    endDate?: Date | string;
    duration?: string;
    description?: string;
  }[];
  education?: {
    institution: string;
    schoolLogo?: string;
    degree?: string;
    field?: string;
    startDate?: Date | string;
    endDate?: Date | string;
    duration?: string;
    description?: string;
  }[];
  skills?: string[];
}

export interface CommentAuthor {
  id: string;
  name: string;
  profileUrl: string;
  headline?: string;
  scrapedData?: LinkedInProfile | null;
}

export interface PostInfo {
    id: string;
    content: string;
}

export interface FetchInteractionsResponse {
    profiles: any[]; // Using any[] temporarily as the raw structure might differ before mapping to CommentAuthor
    post: PostInfo;
}

export type ScrapedData = CommentAuthor[];

export type Message = 
  | { type: 'SCRAPE_REQUEST' }
  | { type: 'SCRAPE_SUCCESS'; data: ScrapedData }
  | { type: 'SCRAPE_ERROR'; error: string };
