import { Building, GraduationCap, MapPin, Users } from 'lucide-react';
import React from 'react';
import { Badge } from '@/components/ui/badge';
import type { FlattenedProfile } from '../../shared/types';

type LinkedInProfileCollapseProps = {
  profile: FlattenedProfile;
};

export const LinkedInProfileCollapse = React.memo(
  ({ profile }: LinkedInProfileCollapseProps) => {
    return (
      <div className="w-full space-y-4 rounded-lg border bg-gray-50 p-4 mt-2">
        {/* Header Section */}
        <div className="flex items-start gap-4">
          <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 overflow-hidden">
            {profile.profileImageUrl ? (
              <img
                src={profile.profileImageUrl}
                alt={profile.fullName}
                className="h-16 w-16 object-cover"
              />
            ) : (
              <div className="text-xl font-semibold text-blue-600">
                {profile.fullName.charAt(0)}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              <a
                className="text-blue-600 hover:text-blue-800 hover:underline"
                href={profile.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {profile.fullName}
              </a>
            </h3>
            {profile.headline && (
              <p className="text-sm whitespace-pre-line text-gray-600 line-clamp-2">
                {profile.headline}
              </p>
            )}
            <div className="mt-1 flex flex-wrap gap-2 text-sm text-gray-500">
              {profile.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  <span>
                    {typeof profile.location === 'object'
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      ? (profile.location as any).city || (profile.location as any).country || 'Location unknown'
                      : profile.location}
                  </span>
                </div>
              )}
              {profile.connections && (
                <div className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  <span>
                    {profile.connections}
                    {' '}
                    connexions
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Summary */}
        {profile.summary && (
          <div>
            <h4 className="mb-2 font-medium text-gray-900">À propos</h4>
            <p className="text-sm leading-relaxed whitespace-pre-line text-gray-700 max-h-40 overflow-y-auto">
              {profile.summary}
            </p>
          </div>
        )}

        {/* Experience */}
        {profile.experience && profile.experience.length > 0 && (
          <div>
            <h4 className="mb-3 flex items-center gap-2 font-medium text-gray-900">
              <Building className="h-4 w-4" />
              Expérience
            </h4>
            <div className="space-y-3">
              {profile.experience.map((exp, index) => (
                <div key={index} className="border-l-2 border-blue-200 pl-3">
                  <div className="flex items-start gap-3">
                    {(exp.companyLogo && (
                      <img
                        src={exp.companyLogo}
                        alt={exp.company}
                        className="mt-1 h-8 w-8 flex-shrink-0 rounded object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    )) || (
                        <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-gray-200 object-cover">
                          <span className="text-sm text-gray-500">
                            {exp.company?.charAt(0) || 'C'}
                          </span>
                        </div>
                      )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">
                        {exp.title}
                      </div>
                      <div className="text-sm font-bold truncate">{exp.company}</div>
                      {exp.companyLocation && (
                        <div className="text-xs text-gray-500">
                          {exp.companyLocation}
                        </div>
                      )}
                      <div className="text-xs text-gray-500">
                        {formatDateRange(exp.startDate, exp.endDate) || exp.duration}
                      </div>
                      {exp.description && (
                        <p className="mt-1 text-xs leading-relaxed whitespace-pre-line text-gray-600 line-clamp-3">
                          {exp.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Education */}
        {profile.education && profile.education.length > 0 && (
          <div>
            <h4 className="mb-3 flex items-center gap-2 font-medium text-gray-900">
              <GraduationCap className="h-4 w-4" />
              Formation
            </h4>
            <div className="space-y-2">
              {profile.education.map((edu, index) => (
                <div key={index} className="border-l-2 border-green-200 pl-3">
                  <div className="flex items-start gap-3">
                    {(edu.schoolLogo && (
                      <img
                        src={edu.schoolLogo}
                        alt={edu.institution}
                        className="mt-1 h-8 w-8 flex-shrink-0 rounded object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                        }}
                      />
                    )) || (
                        <div className="mt-1 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-gray-200 object-cover">
                          <span className="text-sm text-gray-500">
                            {edu.institution?.charAt(0) || 'S'}
                          </span>
                        </div>
                      )}
                    <div className="flex-1 min-w-0">
                      <div className="font-bold whitespace-pre-line truncate">
                        {edu.institution}
                      </div>
                      <div className="text-sm whitespace-pre-line text-gray-600">
                        {edu.degree}
                        {edu.field && ` • ${edu.field}`}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDateRange(edu.startDate, edu.endDate) || edu.duration}
                      </div>
                      {edu.description && (
                        <p className="mt-1 text-xs leading-relaxed whitespace-pre-line text-gray-600 line-clamp-2">
                          {edu.description}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skills */}
        {profile.skills && profile.skills.length > 0 && (
          <div>
            <h4 className="mb-2 font-medium text-gray-900">Compétences</h4>
            <div className="flex flex-wrap gap-1">
              {profile.skills.map((skill, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {skill}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  },
);

function formatDateRange(start?: string | Date, end?: string | Date) {
    if (!start) return null;
    
    const startDate = new Date(start);
    const startStr = startDate.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
    
    if (!end) return `${startStr} - Présent`;
    
    const endDate = new Date(end);
    const endStr = endDate.toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' });
    
    return `${startStr} - ${endStr}`;
}

