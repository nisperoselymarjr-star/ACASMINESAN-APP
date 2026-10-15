import { Injectable } from '@angular/core';

export type ChannelType = 'text' | 'voice';
export type ServerTemplateId = 'community' | 'gaming' | 'study' | 'friends';

export interface ServerChannel {
  name: string;
  type: ChannelType;
}

export const SERVER_TEMPLATE_CHANNELS: Record<ServerTemplateId, ServerChannel[]> = {
  community: [],
  gaming: [
    { name: 'looking-for-group', type: 'text' },
    { name: 'clips', type: 'text' },
    { name: 'party-room', type: 'voice' },
  ],
  study: [
    { name: 'resources', type: 'text' },
    { name: 'questions', type: 'text' },
    { name: 'study-room', type: 'voice' },
  ],
  friends: [
    { name: 'plans', type: 'text' },
    { name: 'memes', type: 'text' },
    { name: 'hangout', type: 'voice' },
  ],
};

export interface ServerCategory {
  name: string;
  channels: ServerChannel[];
}

export interface ServerEvent {
  id: string;
  title: string;
  date: string;
  description: string;
}

export type MemberAuthority = 'owner' | 'admin' | 'member';
export type MemberStatus = 'online' | 'idle' | 'do-not-disturb' | 'invisible';

export const CURRENT_MEMBER_ID = 'current-member';

export interface ServerMember {
  id: string;
  name: string;
  authority: MemberAuthority;
  status?: MemberStatus;
  role?: string | null;
}

export interface Server {
  name: string;
  initial: string;
  templateId: ServerTemplateId;
  accentColor?: string;
  inviteCode: string;
  ownerId: string;
  categories: ServerCategory[];
  events: ServerEvent[];
  members: ServerMember[];
  roles: string[];
}

export interface ServerCreationOptions {
  templateId?: ServerTemplateId;
  accentColor?: string;
  includeGeneral?: boolean;
  includeWelcome?: boolean;
  includeRules?: boolean;
  includeAnnouncements?: boolean;
  includedTemplateChannels?: ServerChannel[];
  additionalChannels?: string[];
  invitedMembers?: ServerMember[];
}

export interface ServerCreationDraft {
  name: string;
  options: ServerCreationOptions;
  selectedFriendIds: number[];
}

@Injectable({ providedIn: 'root' })
export class ServerStoreService {
  readonly servers: Server[] = [];
  activeServer: Server | null = null;
  creationDraft: ServerCreationDraft | null = null;

  saveCreationDraft(name: string, options: ServerCreationOptions): void {
    this.creationDraft = {
      name,
      options,
      selectedFriendIds: this.creationDraft?.selectedFriendIds ?? [],
    };
  }

  clearCreationDraft(): void {
    this.creationDraft = null;
  }

  addServer(name: string, options: ServerCreationOptions = {}): void {
    const templateId = options.templateId ?? 'community';
    const includedTemplateChannels = options.includedTemplateChannels ?? SERVER_TEMPLATE_CHANNELS[templateId];
    const welcomeChannels: ServerChannel[] = [];
    if (options.includeWelcome ?? true) {
      welcomeChannels.push({ name: 'welcome', type: 'text' });
    }
    if (options.includeRules ?? true) {
      welcomeChannels.push({ name: 'rules', type: 'text' });
    }

    const textChannels: ServerChannel[] = options.includeGeneral ?? true ? [{ name: 'general', type: 'text' }] : [];
    textChannels.push(...includedTemplateChannels.filter((channel) => channel.type === 'text'));
    if (options.includeAnnouncements ?? true) {
      textChannels.push({ name: 'announcements', type: 'text' });
    }

    const voiceChannels = [
      { name: 'Main Lobby', type: 'voice' as const },
      ...includedTemplateChannels.filter(
        (channel) => channel.type === 'voice' && channel.name.toLowerCase() !== 'main lobby',
      ),
    ];
    const existingNames = new Set(
      [...welcomeChannels, ...textChannels, ...voiceChannels].map((channel) => channel.name.toLowerCase()),
    );
    for (const channelName of options.additionalChannels ?? []) {
      const normalizedName = channelName.trim();
      const normalizedKey = normalizedName.toLowerCase();
      if (normalizedName && !existingNames.has(normalizedKey)) {
        textChannels.push({ name: normalizedName, type: 'text' });
        existingNames.add(normalizedKey);
      }
    }

    const categories: ServerCategory[] = [];
    if (welcomeChannels.length) {
      categories.push({ name: 'WELCOME', channels: welcomeChannels });
    }
    if (textChannels.length) {
      categories.push({ name: 'TEXT CHANNELS', channels: textChannels });
    }
    if (voiceChannels.length) {
      categories.push({ name: 'VOICE CHANNELS', channels: voiceChannels });
    }

    const server: Server = {
      name,
      initial: name.charAt(0).toUpperCase(),
      templateId,
      accentColor: options.accentColor,
      inviteCode: Math.random().toString(36).slice(2, 8).toUpperCase(),
      ownerId: CURRENT_MEMBER_ID,
      members: [
        { id: CURRENT_MEMBER_ID, name: 'Komyunity member', authority: 'owner', status: 'online', role: null },
        ...(options.invitedMembers ?? []),
      ],
      roles: [],
      categories,
      events: [],
    };

    this.servers.push(server);
    this.activeServer = server;
  }

  deleteServer(server: Server, actorId: string): boolean {
    if (!this.isServerOwner(server, actorId)) {
      return false;
    }
    const serverIndex = this.servers.indexOf(server);
    if (serverIndex === -1) {
      return false;
    }

    this.servers.splice(serverIndex, 1);
    if (this.activeServer === server) {
      this.activeServer = this.servers[0] ?? null;
    }
    return true;
  }

  isServerOwner(server: Server, memberId: string): boolean {
    return server.ownerId === memberId;
  }

  canManageServer(server: Server, memberId: string): boolean {
    return this.isServerOwner(server, memberId) || server.members.some(
      (member) => member.id === memberId && member.authority === 'admin',
    );
  }

  addChannel(server: Server, name: string, type: ChannelType, actorId: string, customCategoryName?: string): boolean {
    if (!this.canManageServer(server, actorId)) {
      return false;
    }
    const normalizedName = name.trim();
    if (!normalizedName || server.categories.some((category) =>
      category.channels.some((channel) => channel.name.toLowerCase() === normalizedName.toLowerCase()))) {
      return false;
    }

    const categoryName = customCategoryName || (type === 'voice' ? 'VOICE CHANNELS' : 'TEXT CHANNELS');
    let category = server.categories.find((item) => item.name === categoryName);
    if (customCategoryName && !category) {
      return false;
    }
    if (!category) {
      category = { name: categoryName, channels: [] };
      server.categories.push(category);
    }
    category.channels.push({ name: normalizedName, type });
    return true;
  }

  deleteChannel(server: Server, name: string, actorId: string): boolean {
    if (!this.servers.includes(server) || !this.canManageServer(server, actorId)) {
      return false;
    }
    const category = server.categories.find((item) =>
      item.channels.some((channel) => channel.name === name));
    if (!category) {
      return false;
    }
    const channelIndex = category.channels.findIndex((channel) => channel.name === name);
    if (channelIndex === -1) {
      return false;
    }
    category.channels.splice(channelIndex, 1);
    return true;
  }

  addCategory(server: Server, name: string, actorId: string): boolean {
    if (!this.canManageServer(server, actorId)) {
      return false;
    }
    const normalizedName = name.trim();
    if (!normalizedName || server.categories.some((category) =>
      category.name.toLowerCase() === normalizedName.toLowerCase())) {
      return false;
    }

    server.categories.push({ name: normalizedName, channels: [] });
    return true;
  }

  addEvent(server: Server, title: string, date: string, description: string, actorId: string): boolean {
    if (!this.canManageServer(server, actorId)) {
      return false;
    }
    const normalizedTitle = title.trim();
    const normalizedDescription = description.trim();
    const eventDate = new Date(`${date}T00:00:00`);
    if (!normalizedTitle || !/^\d{4}-\d{2}-\d{2}$/.test(date) ||
      Number.isNaN(eventDate.getTime()) || this.localDateKey(eventDate) !== date ||
      date < this.localDateKey(new Date())) {
      return false;
    }

    server.events.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: normalizedTitle,
      date,
      description: normalizedDescription,
    });
    return true;
  }

  addRole(server: Server, name: string, actorId: string): boolean {
    if (!this.canManageServer(server, actorId)) {
      return false;
    }
    const normalizedName = name.trim();
    if (!normalizedName || server.roles.some((role) => role.toLowerCase() === normalizedName.toLowerCase())) {
      return false;
    }

    server.roles.push(normalizedName);
    return true;
  }

  setMemberRole(server: Server, member: ServerMember, role: string | null, actorId: string): boolean {
    if (!this.canManageServer(server, actorId) || !server.members.includes(member) || (role && !server.roles.includes(role))) {
      return false;
    }

    member.role = role;
    return true;
  }

  setMemberAuthority(server: Server, member: ServerMember, authority: 'admin' | 'member', actorId: string): boolean {
    if (!this.isServerOwner(server, actorId) || !server.members.includes(member) || member.id === server.ownerId) {
      return false;
    }

    member.authority = authority;
    return true;
  }

  private localDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}