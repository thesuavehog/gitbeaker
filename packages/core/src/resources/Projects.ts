import * as Mime from 'mime/lite';
import { BaseResource } from '@gitbeaker/requester-utils';
import { endpoint, RequestHelper } from '../infrastructure';
import type {
  BaseRequestOptions,
  PaginatedRequestOptions,
  Sudo,
  ShowExpanded,
  GitlabAPIResponse,
  UploadMetadataOptions,
} from '../infrastructure';
import type { ProjectRemoteMirrorSchema } from './ProjectRemoteMirrors';
import type { UserSchema } from './Users';
import type { CondensedNamespaceSchema } from './Namespaces';
import type { SimpleGroupSchema } from './Groups';
import type { AccessLevel } from '../templates/types';

export interface ProjectStarrerSchema extends Record<string, unknown> {
  starred_since: string;
  user: Omit<UserSchema, 'created_at'>;
}

export interface ProjectStoragePath extends Record<string, unknown> {
  project_id: string | number;
  disk_path: string;
  created_at: string;
  repository_storage: string;
}

export interface ProjectStatisticsSchema {
  commit_count: number;
  storage_size: number;
  repository_size: number;
  wiki_size: number;
  lfs_objects_size: number;
  job_artifacts_size: number;
  pipeline_artifacts_size: number;
  packages_size: number;
  snippets_size: number;
  uploads_size: number;
}

export interface CondensedProjectSchema extends Record<string, unknown> {
  id: number;
  web_url: string;
  name: string;
  path: string;
}

export interface SimpleProjectSchema extends CondensedProjectSchema {
  description?: null;
  name_with_namespace: string;
  path_with_namespace: string;
  created_at: string;
}

export interface ProjectSchema extends SimpleProjectSchema {
  id: number;
  default_branch: string;
  ssh_url_to_repo: string;
  http_url_to_repo: string;
  web_url: string;
  readme_url: string;
  topics?: string[];
  name: string;
  path: string;
  last_activity_at: string;
  forks_count: number;
  avatar_url: string;
  star_count: number;
}

export interface ExpandedProjectSchema extends ProjectSchema {
  issues_template?: string;
  merge_requests_template?: string;
  visibility: string;
  owner: Pick<UserSchema, 'id' | 'name' | 'created_at'>;
  issues_enabled: boolean;
  open_issues_count: number;
  merge_requests_enabled: boolean;
  jobs_enabled: boolean;
  wiki_enabled: boolean;
  snippets_enabled: boolean;
  can_create_merge_request_in: boolean;
  resolve_outdated_diff_discussions: boolean;
  container_registry_enabled: boolean;
  container_registry_access_level: string;
  creator_id: number;
  namespace: CondensedNamespaceSchema;
  import_status: string;
  archived: boolean;
  shared_runners_enabled: boolean;
  runners_token: string;
  ci_default_git_depth: number;
  ci_forward_deployment_enabled: boolean;
  public_jobs: boolean;
  shared_with_groups?: string[];
  only_allow_merge_if_pipeline_succeeds: boolean;
  allow_merge_on_skipped_pipeline: boolean;
  restrict_user_defined_variables: boolean;
  only_allow_merge_if_all_discussions_are_resolved: boolean;
  remove_source_branch_after_merge: boolean;
  request_access_enabled: boolean;
  merge_method: string;
  squash_option: string;
  autoclose_referenced_issues: boolean;
  suggestion_commit_message?: string;
  merge_commit_template?: null;
  squash_commit_template?: null;
  marked_for_deletion_on: string;
  approvals_before_merge: number;
  container_registry_image_prefix: string;
  _links: {
    self: string;
    issues: string;
    merge_requests: string;
    repo_branches: string;
    labels: string;
    events: string;
    members: string;
  };
}

export interface ProjectFileUploadSchema extends Record<string, unknown> {
  alt: string;
  url: string;
  full_path: string;
  markdown: string;
}

export class Projects<C extends boolean = false> extends BaseResource<C> {
  all<E extends boolean = false, P extends 'keyset' | 'offset' = 'keyset'>(
    options: { simple: true } & PaginatedRequestOptions<E, P>,
  ): Promise<GitlabAPIResponse<ProjectSchema[], C, E, P>>;
  all<E extends boolean = false, P extends 'keyset' | 'offset' = 'keyset'>(
    options: { statistics: true } & PaginatedRequestOptions<E, P>,
  ): Promise<
    GitlabAPIResponse<(ExpandedProjectSchema & { statistics: ProjectStatisticsSchema })[], C, E, P>
  >;
  all<E extends boolean = false, P extends 'keyset' | 'offset' = 'keyset'>(
    {
      userId,
      starredOnly,
      ...options
    }: { userId?: string; starredOnly?: boolean } & PaginatedRequestOptions<E, P> = {} as any,
  ): Promise<GitlabAPIResponse<ExpandedProjectSchema[], C, E, P>> {
    let uri: string;

    if (userId && starredOnly) uri = `users/${userId}/starred_projects`;
    else if (userId) uri = `users/${userId}/projects`;
    else uri = 'projects';

    return RequestHelper.get<ExpandedProjectSchema[]>()(
      this,
      uri,
      options as PaginatedRequestOptions<E, P>,
    );
  }

  archive<E extends boolean = false>(
    projectId: string | number,
    options?: Sudo & ShowExpanded<E>,
  ): Promise<GitlabAPIResponse<ExpandedProjectSchema, C, E, void>> {
    return RequestHelper.post<ExpandedProjectSchema>()(
      this,
      endpoint`projects/${projectId}/archive`,
      options,
    );
  }

  create<E extends boolean = false>(
    {
      userId,
      ...options
    }: ({ name: string } | { path: string }) & {
      userId?: number;
    } & BaseRequestOptions<E> = {} as any,
  ): Promise<GitlabAPIResponse<ExpandedProjectSchema, C, E, void>> {
    const url = userId ? `projects/user/${userId}` : 'projects';

    return RequestHelper.post<ExpandedProjectSchema>()(this, url, options);
  }

  createForkRelationship<E extends boolean = false>(
    projectId: string | number,
    forkedFromId: string | number,
    options?: Sudo & ShowExpanded<E>,
  ): Promise<GitlabAPIResponse<unknown, C, E, void>> {
    return RequestHelper.post<unknown>()(
      this,
      endpoint`projects/${projectId}/fork/${forkedFromId}`,
      options,
    );
  }

  // Helper method - Duplicated from ProjectRemoteMirrors
  createPullMirror<E extends boolean = false>(
    projectId: string | number,
    url: string,
    mirror: boolean,
    options?: { onlyProtectedBranches?: boolean } & Sudo & ShowExpanded<E>,
  ): Promise<GitlabAPIResponse<ProjectRemoteMirrorSchema, C, E, void>> {
    return RequestHelper.post<ProjectRemoteMirrorSchema>()(
      this,
      endpoint`projects/${projectId}/mirror/pull`,
      {
        importUrl: url,
        mirror,
        ...options,
      },
    );
  }

  downloadSnapshot<E extends boolean = false>(
    projectId: string | number,
    options?: { wiki?: boolean } & Sudo & ShowExpanded<E>,
  ): Promise<GitlabAPIResponse<Blob, C, E, void>> {
    return RequestHelper.get<Blob>()(this, endpoint`projects/${projectId}/snapshot`, options);
  }

  edit<E extends boolean = false>(
    projectId: string | number,
    options?: BaseRequestOptions<E>,
  ): Promise<GitlabAPIResponse<ExpandedProjectSchema, C, E, void>> {
    return RequestHelper.put<ExpandedProjectSchema>()(
      this,
      endpoint`projects/${projectId}`,
      options,
    );
  }

  fork<E extends boolean = false>(
    projectId: string | number,
    options?: BaseRequestOptions<E>,
  ): Promise<GitlabAPIResponse<ExpandedProjectSchema, C, E, void>> {
    return RequestHelper.post<ExpandedProjectSchema>()(
      this,
      endpoint`projects/${projectId}/fork`,
      options,
    );
  }

  housekeeping<E extends boolean = false>(
    projectId: string | number,
    options?: Sudo & ShowExpanded<E>,
  ): Promise<GitlabAPIResponse<unknown, C, E, void>> {
    return RequestHelper.post<unknown>()(
      this,
      endpoint`projects/${projectId}/housekeeping`,
      options,
    );
  }

  importProjectMembers<E extends boolean = false>(
    projectId: string | number,
    sourceProjectId: string | number,
    options?: Sudo & ShowExpanded<E>,
  ): Promise<GitlabAPIResponse<unknown, C, E, void>> {
    return RequestHelper.post<unknown>()(
      this,
      endpoint`projects/${projectId}/import_project_members/${sourceProjectId}`,
      options,
    );
  }

  remove<E extends boolean = false>(
    projectId: string | number,
    options?: Sudo & ShowExpanded<E>,
  ): Promise<GitlabAPIResponse<void, C, E, void>> {
    return RequestHelper.del()(this, endpoint`projects/${projectId}`, options);
  }

  removeForkRelationship<E extends boolean = false>(
    projectId: string | number,
    options?: Sudo & ShowExpanded<E>,
  ) {
    return RequestHelper.del()(this, endpoint`projects/${projectId}/fork`, options);
  }

  restore<E extends boolean = false>(
    projectId: string | number,
    options?: Sudo & ShowExpanded<E>,
  ): Promise<GitlabAPIResponse<unknown, C, E, void>> {
    return RequestHelper.post<unknown>()(this, endpoint`projects/${projectId}/restore`, options);
  }

  search<E extends boolean = false>(
    projectName: string,
    options?: { sort?: string; orderBy?: string } & Sudo & ShowExpanded<E>,
  ): Promise<GitlabAPIResponse<unknown, C, E, void>> {
    return RequestHelper.get<ProjectSchema[]>()(this, 'projects', {
      search: projectName,
      ...options,
    });
  }

  share<E extends boolean = false>(
    projectId: string | number,
    groupId: string | number,
    groupAccess: number,
    options?: { expiresAt?: string } & Sudo & ShowExpanded<E>,
  ): Promise<GitlabAPIResponse<unknown, C, E, void>> {
    return RequestHelper.post<unknown>()(this, endpoint`projects/${projectId}/share`, {
      groupId,
      groupAccess,
      ...options,
    });
  }

  show<E extends boolean = false>(
    projectId: string | number,
    options?: { license?: boolean; statistics?: boolean; withCustomAttributes?: boolean } & Sudo &
      ShowExpanded<E>,
  ): Promise<GitlabAPIResponse<ExpandedProjectSchema, C, E, void>> {
    return RequestHelper.get<ExpandedProjectSchema>()(
      this,
      endpoint`projects/${projectId}`,
      options,
    );
  }

  showForks<E extends boolean = false>(
    projectId: string | number,
    options: { simple: true } & BaseRequestOptions<E>,
  ): Promise<GitlabAPIResponse<ProjectSchema[], C, E, void>>;
  showForks<E extends boolean = false>(
    projectId: string | number,
    options: { statistics: true } & BaseRequestOptions<E>,
  ): Promise<
    GitlabAPIResponse<
      (ExpandedProjectSchema & { statistics: ProjectStatisticsSchema })[],
      C,
      E,
      void
    >
  >;
  showForks<E extends boolean = false>(
    projectId: string | number,
    options?: BaseRequestOptions<E>,
  ): Promise<GitlabAPIResponse<ExpandedProjectSchema[], C, E, void>> {
    return RequestHelper.get<ExpandedProjectSchema[]>()(
      this,
      endpoint`projects/${projectId}/forks`,
      options,
    );
  }

  showGroups<E extends boolean = false>(
    projectId: string | number,
    options?: {
      search?: string;
      skipGroups?: number[];
      withShared?: boolean;
      sharedMinAccessLevel?: AccessLevel;
      sharedVisibleOnly?: boolean;
    } & Sudo &
      ShowExpanded<E>,
  ): Promise<GitlabAPIResponse<SimpleGroupSchema[], C, E, void>> {
    return RequestHelper.get<SimpleGroupSchema[]>()(
      this,
      endpoint`projects/${projectId}/groups`,
      options,
    );
  }

  showLanguages<E extends boolean = false>(
    projectId: string | number,
    options?: Sudo & ShowExpanded<E>,
  ): Promise<GitlabAPIResponse<{ [name: string]: number }, C, E, void>> {
    return RequestHelper.get<{ [name: string]: number }>()(
      this,
      endpoint`projects/${projectId}/languages`,
      options,
    );
  }

  showStarrers<E extends boolean = false>(
    projectId: string | number,
    options?: { search?: string } & Sudo & ShowExpanded<E>,
  ): Promise<GitlabAPIResponse<ProjectStarrerSchema[], C, E, void>> {
    return RequestHelper.get<ProjectStarrerSchema[]>()(
      this,
      endpoint`projects/${projectId}/starrers`,
      options,
    );
  }

  showStoragePaths<E extends boolean = false>(
    projectId: string | number,
    options?: Sudo & ShowExpanded<E>,
  ): Promise<GitlabAPIResponse<ProjectStoragePath[], C, E, void>> {
    return RequestHelper.get<ProjectStoragePath[]>()(
      this,
      endpoint`projects/${projectId}/storage`,
      options,
    );
  }

  showUsers<E extends boolean = false>(
    projectId: string | number,
    options?: { search?: string; skipUsers?: number[] } & Sudo & ShowExpanded<E>,
  ): Promise<GitlabAPIResponse<Omit<UserSchema, 'created_at'>[], C, E, void>> {
    return RequestHelper.get<Omit<UserSchema, 'created_at'>[]>()(
      this,
      endpoint`projects/${projectId}/users`,
      options,
    );
  }

  star<E extends boolean = false>(
    projectId: string | number,
    options?: Sudo & ShowExpanded<E>,
  ): Promise<GitlabAPIResponse<ExpandedProjectSchema, C, E, void>> {
    return RequestHelper.post<ExpandedProjectSchema>()(
      this,
      endpoint`projects/${projectId}/star`,
      options,
    );
  }

  transfer<E extends boolean = false>(
    projectId: string | number,
    namespaceId: string | number,
    options?: Sudo & ShowExpanded<E>,
  ) {
    return RequestHelper.put<ExpandedProjectSchema>()(
      this,
      endpoint`projects/${projectId}/transfer`,
      {
        ...options,
        namespace: namespaceId,
      },
    );
  }

  unarchive<E extends boolean = false>(
    projectId: string | number,
    options?: Sudo & ShowExpanded<E>,
  ): Promise<GitlabAPIResponse<ExpandedProjectSchema, C, E, void>> {
    return RequestHelper.post<ExpandedProjectSchema>()(
      this,
      endpoint`projects/${projectId}/unarchive`,
      options,
    );
  }

  unshare<E extends boolean = false>(
    projectId: string | number,
    groupId: string | number,
    options?: Sudo & ShowExpanded<E>,
  ): Promise<GitlabAPIResponse<void, C, E, void>> {
    return RequestHelper.del()(this, endpoint`projects/${projectId}/share/${groupId}`, options);
  }

  unstar<E extends boolean = false>(
    projectId: string | number,
    options?: Sudo & ShowExpanded<E>,
  ): Promise<GitlabAPIResponse<ExpandedProjectSchema, C, E, void>> {
    return RequestHelper.post<ExpandedProjectSchema>()(
      this,
      endpoint`projects/${projectId}/unstar`,
      options,
    );
  }

  upload<E extends boolean = false>(
    projectId: string | number,
    content: string,
    { metadata, ...options }: { metadata?: UploadMetadataOptions } & Sudo & ShowExpanded<E> = {},
  ): Promise<GitlabAPIResponse<unknown, C, E, void>> {
    const meta = { ...metadata };

    if (!meta.contentType && meta.filename)
      meta.contentType = Mime.getType(meta.filename) || undefined;

    return RequestHelper.post<unknown>()(this, endpoint`projects/${projectId}/uploads`, {
      ...options,
      isForm: true,
      file: [content, meta],
    });
  }

  uploadAvatar<E extends boolean = false>(
    projectId: string | number,
    content: string,
    { metadata, ...options }: { metadata?: UploadMetadataOptions } & Sudo & ShowExpanded<E> = {},
  ): Promise<GitlabAPIResponse<{ avatar_url: string }, C, E, void>> {
    const meta = { ...metadata };

    if (!meta.contentType && meta.filename)
      meta.contentType = Mime.getType(meta.filename) || undefined;

    return RequestHelper.put<{ avatar_url: string }>()(this, endpoint`projects/${projectId}`, {
      ...options,
      isForm: true,
      file: [content, meta],
    });
  }
}
