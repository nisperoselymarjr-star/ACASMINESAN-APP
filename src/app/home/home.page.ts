import { Component, HostListener, inject, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AccountProfileStoreService } from '../account-profile-store.service';
import { ChannelType, CURRENT_MEMBER_ID, MemberAuthority, MemberStatus, Server, ServerEvent, ServerMember, ServerStoreService } from '../server-store.service';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage implements OnDestroy {
  readonly currentMemberId = CURRENT_MEMBER_ID;
  readonly statusOptions = [
    { value: 'online', label: 'Online' },
    { value: 'idle', label: 'Idle' },
    { value: 'do-not-disturb', label: 'Do not disturb' },
    { value: 'invisible', label: 'Invisible' },
  ] as const;
  joinedServers: Server[];
  activeServer: Server | null;
  activeChannel = '';
  mobileChannelOpen = false;
  voiceJoined = false;
  voiceChatOpen = false;
  microphoneEnabled = true;
  deafened = false;
  cameraStream: MediaStream | null = null;
  screenStream: MediaStream | null = null;
  voiceMediaError = '';
  messageDraft = '';
  selectedMember: ServerMember | null = null;
  memberProfilePosition: Record<string, string> = {};
  readonly friendRequestsSent = new Set<string>();
  adminPanelOpen = false;
  inviteDialogOpen = false;
  invitePreviewVisible = false;
  inviteStatus = '';
  serverMenuOpen = false;
  channelSettingsOpen: string | null = null;
  deleteConfirmation: { type: 'server' | 'channel'; name: string } | null = null;
  channelBeingEdited: { currentName: string; name: string } | null = null;
  editChannelError = '';
  categoryDialogOpen = false;
  eventDialogOpen = false;
  newCategoryName = '';
  categoryError = '';
  newEventTitle = '';
  newEventDate = this.getLocalDateKey(new Date());
  newEventDescription = '';
  eventError = '';
  activeDueEvent: { event: ServerEvent; serverName: string } | null = null;
  newChannelName = '';
  newChannelType: ChannelType = 'text';
  newChannelCategory = '';
  channelError = '';
  adminSection: 'channels' | 'roles' | 'members' = 'channels';
  newRoleName = '';
  roleError = '';
  status: (typeof this.statusOptions)[number]['value'] = 'online';
  profileImage: string | null = null;
  displayName = 'Member';
  accountMenuOpen = false;
  accountManagerOpen = false;
  confirmAccountRemoval = false;

  private readonly channelMessages = new Map<string, Array<{ author: string; content: string; sentAt: Date }>>();
  private readonly channelMemberships = new Map<string, Set<string>>();
  private readonly serverStore = inject(ServerStoreService);
  private readonly router = inject(Router);
  private readonly accountProfiles = inject(AccountProfileStoreService);
  private readonly notifiedEventIds = new Set<string>();
  private readonly dueEventQueue: Array<{ event: ServerEvent; serverName: string }> = [];
  private readonly eventCheckInterval = window.setInterval(() => this.checkScheduledEvents(), 30_000);
  private mediaSession = 0;

  constructor() {
    const serverStore = this.serverStore;
    this.joinedServers = serverStore.servers;
    this.activeServer = serverStore.activeServer;
    this.loadProfileAvatar();
    this.checkScheduledEvents();
  }

  ionViewWillEnter(): void {
    this.joinedServers = this.serverStore.servers;
    const activeServer = this.serverStore.activeServer;
    if (this.activeServer !== activeServer) {
      this.removeCurrentMemberFromVoiceChannel();
      this.stopLocalMedia();
      this.activeServer = activeServer;
      this.activeChannel = '';
      this.mobileChannelOpen = false;
      this.voiceJoined = false;
      this.voiceChatOpen = false;
      this.microphoneEnabled = true;
      this.deafened = false;
    }
    this.loadProfileAvatar();
    this.checkScheduledEvents();
  }

  ngOnDestroy(): void {
    window.clearInterval(this.eventCheckInterval);
    this.stopLocalMedia();
  }

  private loadProfileAvatar(): void {
    const profile = this.accountProfiles.loadProfile();
    this.profileImage = profile?.avatar ?? null;
    this.displayName = profile?.displayName
      || this.accountProfiles.getActiveAccountIdentifier()
      || 'Member';
    for (const server of this.joinedServers) {
      const currentMember = server.members.find((member) => member.id === CURRENT_MEMBER_ID);
      if (currentMember) {
        currentMember.name = this.displayName;
      }
    }
  }

  selectServer(server: Server): void {
    this.removeCurrentMemberFromVoiceChannel();
    this.stopLocalMedia();
    this.serverStore.activeServer = server;
    this.activeServer = server;
    this.activeChannel = '';
    this.mobileChannelOpen = false;
    this.voiceJoined = false;
    this.voiceChatOpen = false;
    this.microphoneEnabled = true;
    this.deafened = false;
    this.closeAdminPanel();
    this.closeInviteDialog();
    this.serverMenuOpen = false;
    this.channelSettingsOpen = null;
    this.deleteConfirmation = null;
    this.categoryDialogOpen = false;
    this.eventDialogOpen = false;
    this.closeMemberProfile();
  }

  selectChannel(channel: string): void {
    this.channelSettingsOpen = null;
    const previousChannel = this.activeChannel;
    const previousServer = this.activeServer;
    if (channel !== previousChannel
      && this.voiceJoined
      && previousServer
      && previousChannel
      && this.activeChannelType === 'voice') {
      this.removeChannelMember(previousServer, previousChannel, CURRENT_MEMBER_ID);
    }
    if (this.activeChannel !== channel) {
      this.stopLocalMedia();
      this.voiceJoined = false;
      this.microphoneEnabled = true;
      this.deafened = false;
      this.voiceChatOpen = false;
    }
    this.activeChannel = channel;
    if (this.activeServer && this.activeChannelType !== 'voice') {
      this.addChannelMember(this.activeServer, channel, CURRENT_MEMBER_ID);
    }
    this.messageDraft = '';
    if (this.activeChannelType === 'voice' && !this.voiceJoined) {
      this.microphoneEnabled = true;
    }
    this.mobileChannelOpen = true;
    this.closeMemberProfile();
  }

  requestDeleteServer(): void {
    if (!this.isServerOwner || !this.activeServer) {
      return;
    }
    this.serverMenuOpen = false;
    this.deleteConfirmation = { type: 'server', name: this.activeServer.name };
  }

  requestDeleteChannel(channel: string): void {
    if (!this.canManageServer || !this.activeServer) {
      return;
    }
    this.channelSettingsOpen = null;
    this.deleteConfirmation = { type: 'channel', name: channel };
  }

  requestEditChannel(channel: string): void {
    if (!this.canManageServer) {
      return;
    }
    this.channelSettingsOpen = null;
    this.editChannelError = '';
    this.channelBeingEdited = { currentName: channel, name: channel };
  }

  saveChannelEdit(): void {
    const edit = this.channelBeingEdited;
    const server = this.activeServer;
    if (!edit || !server || !this.canManageServer) {
      return;
    }

    const newName = edit.name.trim();
    if (!this.serverStore.renameChannel(server, edit.currentName, newName, CURRENT_MEMBER_ID)) {
      this.editChannelError = 'Unable to rename the channel. The name may already be in use.';
      return;
    }

    const previousKey = JSON.stringify([server.name, edit.currentName]);
    const updatedKey = JSON.stringify([server.name, newName]);
    const messages = this.channelMessages.get(previousKey);
    if (messages && previousKey !== updatedKey) {
      this.channelMessages.set(updatedKey, messages);
      this.channelMessages.delete(previousKey);
    }
    const joinedMembers = this.channelMemberships.get(previousKey);
    if (joinedMembers && previousKey !== updatedKey) {
      this.channelMemberships.set(updatedKey, joinedMembers);
      this.channelMemberships.delete(previousKey);
    }
    if (this.activeChannel === edit.currentName) {
      this.activeChannel = newName;
    }
    this.channelBeingEdited = null;
    this.editChannelError = '';
  }

  toggleChannelSettings(channel: string, event: Event): void {
    event.stopPropagation();
    if (!this.canManageServer) {
      return;
    }
    this.channelSettingsOpen = this.channelSettingsOpen === channel ? null : channel;
  }

  confirmDelete(): void {
    const confirmation = this.deleteConfirmation;
    const server = this.activeServer;
    if (!confirmation || !server) {
      return;
    }

    if (confirmation.type === 'server') {
      if (!this.serverStore.deleteServer(server, CURRENT_MEMBER_ID)) {
        this.deleteConfirmation = null;
        return;
      }
      this.stopLocalMedia();
      this.joinedServers = this.serverStore.servers;
      this.activeServer = this.serverStore.activeServer;
      this.activeChannel = '';
      this.mobileChannelOpen = false;
      this.voiceJoined = false;
      this.voiceChatOpen = false;
      this.deafened = false;
      this.deleteConfirmation = null;
      return;
    }

    if (!this.serverStore.deleteChannel(server, confirmation.name, CURRENT_MEMBER_ID)) {
      this.deleteConfirmation = null;
      return;
    }
    this.channelMessages.delete(JSON.stringify([server.name, confirmation.name]));
    this.channelMemberships.delete(JSON.stringify([server.name, confirmation.name]));
    if (this.activeChannel === confirmation.name) {
      this.stopLocalMedia();
      this.activeChannel = '';
      this.voiceJoined = false;
      this.voiceChatOpen = false;
      this.deafened = false;
      this.mobileChannelOpen = false;
    }
    this.deleteConfirmation = null;
  }

  get activeChannelMessages(): Array<{ author: string; content: string; sentAt: Date }> {
    return this.channelMessages.get(this.activeChannelKey) ?? [];
  }

  getChannelMembers(channel: string): ServerMember[] {
    const server = this.activeServer;
    if (!server) {
      return [];
    }
    const memberIds = this.channelMemberships.get(JSON.stringify([server.name, channel]));
    return server.members.filter((member) => memberIds?.has(member.id));
  }

  private addChannelMember(server: Server, channel: string, memberId: string): void {
    const channelKey = JSON.stringify([server.name, channel]);
    const members = this.channelMemberships.get(channelKey) ?? new Set<string>();
    members.add(memberId);
    this.channelMemberships.set(channelKey, members);
  }

  private removeChannelMember(server: Server, channel: string, memberId: string): void {
    this.channelMemberships.get(JSON.stringify([server.name, channel]))?.delete(memberId);
  }

  private removeCurrentMemberFromVoiceChannel(): void {
    if (this.voiceJoined && this.activeServer && this.activeChannel && this.activeChannelType === 'voice') {
      this.removeChannelMember(this.activeServer, this.activeChannel, CURRENT_MEMBER_ID);
    }
  }

  isMemberTalking(member: ServerMember, channel: string): boolean {
    return member.id === CURRENT_MEMBER_ID
      && this.activeChannel === channel
      && this.activeChannelType === 'voice'
      && this.voiceJoined
      && this.microphoneEnabled;
  }

  sendMessage(): void {
    const content = this.messageDraft.trim();
    if (!content || !this.activeServer || !this.activeChannel) {
      return;
    }

    const messages = this.channelMessages.get(this.activeChannelKey) ?? [];
    messages.push({ author: this.displayName, content, sentAt: new Date() });
    this.channelMessages.set(this.activeChannelKey, messages);
    this.messageDraft = '';
  }

  returnToChannels(): void {
    this.mobileChannelOpen = false;
  }

  toggleVoiceConnection(): void {
    if (this.voiceJoined) {
      this.removeCurrentMemberFromVoiceChannel();
      this.voiceJoined = false;
      this.voiceChatOpen = false;
      this.deafened = false;
      this.stopLocalMedia();
      return;
    }
    this.voiceMediaError = '';
    this.voiceJoined = true;
    if (this.activeServer && this.activeChannel) {
      this.addChannelMember(this.activeServer, this.activeChannel, CURRENT_MEMBER_ID);
    }
  }

  toggleVoiceChat(): void {
    if (this.voiceJoined) {
      this.voiceChatOpen = !this.voiceChatOpen;
    }
  }

  toggleMicrophone(): void {
    this.microphoneEnabled = !this.microphoneEnabled;
  }

  toggleDeafen(): void {
    this.deafened = !this.deafened;
  }

  async toggleCamera(): Promise<void> {
    if (!this.voiceJoined) {
      return;
    }
    this.voiceMediaError = '';
    if (this.cameraStream) {
      this.stopCamera();
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      this.voiceMediaError = 'Camera access is not supported in this browser.';
      return;
    }

    const mediaSession = this.mediaSession;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      if (!this.voiceJoined || mediaSession !== this.mediaSession) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      this.cameraStream = stream;
    } catch {
      this.voiceMediaError = 'Could not access the camera. Check browser permissions and try again.';
    }
  }

  async toggleScreenShare(): Promise<void> {
    if (!this.voiceJoined) {
      return;
    }
    this.voiceMediaError = '';
    if (this.screenStream) {
      this.stopScreenShare();
      return;
    }
    if (!navigator.mediaDevices?.getDisplayMedia) {
      this.voiceMediaError = 'Screen sharing is not supported in this browser.';
      return;
    }

    const mediaSession = this.mediaSession;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      if (!this.voiceJoined || mediaSession !== this.mediaSession) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      this.screenStream = stream;
      const videoTrack = this.screenStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.addEventListener('ended', () => this.stopScreenShare(), { once: true });
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        this.voiceMediaError = 'Screen sharing was cancelled or permission was denied.';
        return;
      }
      this.voiceMediaError = 'Could not start screen sharing. Try again.';
    }
  }

  private stopCamera(): void {
    const stream = this.cameraStream;
    this.cameraStream = null;
    stream?.getTracks().forEach((track) => track.stop());
  }

  private stopScreenShare(): void {
    const stream = this.screenStream;
    this.screenStream = null;
    stream?.getTracks().forEach((track) => track.stop());
  }

  private stopLocalMedia(): void {
    this.mediaSession += 1;
    this.cameraStream?.getTracks().forEach((track) => track.stop());
    this.screenStream?.getTracks().forEach((track) => track.stop());
    this.cameraStream = null;
    this.screenStream = null;
    this.voiceMediaError = '';
  }

  openMemberProfile(member: ServerMember, event: MouseEvent): void {
    const row = event.currentTarget as HTMLElement;
    const bounds = row.getBoundingClientRect();
    const panelWidth = Math.min(248, window.innerWidth - 24);
    const gap = 10;
    let left = bounds.right + gap;

    if (left + panelWidth > window.innerWidth - 12) {
      left = bounds.left - panelWidth - gap;
    }
    if (left < 12) {
      left = Math.max(12, Math.min(bounds.left, window.innerWidth - panelWidth - 12));
    }

    const maxTop = Math.max(12, window.innerHeight - 232);
    const top = Math.min(Math.max(12, bounds.top), maxTop);
    this.memberProfilePosition = { left: `${left}px`, top: `${top}px` };
    this.selectedMember = member;
  }

  closeMemberProfile(): void {
    this.selectedMember = null;
  }

  addFriend(member: ServerMember): void {
    if (member.id !== CURRENT_MEMBER_ID) {
      this.friendRequestsSent.add(member.id);
    }
  }

  hasFriendRequest(member: ServerMember): boolean {
    return this.friendRequestsSent.has(member.id);
  }

  get inviteLink(): string {
    return this.activeServer
      ? `${window.location.origin}/invite/${encodeURIComponent(this.activeServer.inviteCode)}`
      : '';
  }

  get todayDate(): string {
    return this.getLocalDateKey(new Date());
  }

  openInviteDialog(): void {
    if (!this.activeServer || !this.canManageServer) {
      return;
    }
    this.serverMenuOpen = false;
    this.closeMemberProfile();
    this.inviteDialogOpen = true;
    this.invitePreviewVisible = false;
    this.inviteStatus = '';
  }

  toggleServerMenu(event: Event): void {
    event.stopPropagation();
    if (this.canManageServer) {
      this.serverMenuOpen = !this.serverMenuOpen;
    }
  }

  @HostListener('document:click')
  closeServerMenu(): void {
    this.serverMenuOpen = false;
    this.channelSettingsOpen = null;
  }

  openCreateChannel(): void {
    this.serverMenuOpen = false;
    this.newChannelCategory = '';
    this.openAdminPanel();
  }

  openCreateCategory(): void {
    if (!this.canManageServer) {
      return;
    }
    this.serverMenuOpen = false;
    this.newCategoryName = '';
    this.categoryError = '';
    this.categoryDialogOpen = true;
  }

  createCategory(): void {
    if (!this.activeServer || !this.canManageServer) {
      return;
    }
    if (!this.serverStore.addCategory(this.activeServer, this.newCategoryName, CURRENT_MEMBER_ID)) {
      this.categoryError = 'Enter a unique category name.';
      return;
    }
    this.categoryDialogOpen = false;
    this.newCategoryName = '';
    this.categoryError = '';
  }

  openCreateEvent(): void {
    if (!this.canManageServer) {
      return;
    }
    this.serverMenuOpen = false;
    this.newEventTitle = '';
    this.newEventDate = this.getLocalDateKey(new Date());
    this.newEventDescription = '';
    this.eventError = '';
    this.eventDialogOpen = true;
  }

  createEvent(): void {
    if (!this.activeServer || !this.canManageServer) {
      return;
    }
    if (!this.serverStore.addEvent(
      this.activeServer,
      this.newEventTitle,
      this.newEventDate,
      this.newEventDescription,
      CURRENT_MEMBER_ID,
    )) {
      this.eventError = 'Enter an event title and a valid date that is today or later.';
      return;
    }
    this.eventDialogOpen = false;
    this.checkScheduledEvents();
  }

  dismissDueEvent(): void {
    this.activeDueEvent = null;
    this.checkScheduledEvents();
  }

  async copyInviteLink(): Promise<void> {
    if (!this.canManageServer) {
      return;
    }
    try {
      await navigator.clipboard.writeText(this.inviteLink);
      this.inviteStatus = 'Invite link copied.';
    } catch {
      this.inviteStatus = 'Could not copy the link. Select it above and copy it manually.';
    }
  }

  sendInvite(): void {
    if (this.activeServer && this.canManageServer) {
      this.invitePreviewVisible = true;
    }
  }

  closeInviteDialog(): void {
    this.inviteDialogOpen = false;
    this.invitePreviewVisible = false;
    this.inviteStatus = '';
  }

  get memberGroups(): Array<{ name: string; members: ServerMember[] }> {
    const groups = new Map<string, ServerMember[]>();
    const members = this.activeChannel
      ? this.getChannelMembers(this.activeChannel)
      : this.activeServer?.members ?? [];
    for (const member of members) {
      const groupName = member.authority === 'owner'
        ? 'Owner'
        : member.authority === 'admin'
          ? 'Admins'
          : member.role?.trim() || 'Members';
      const groupMembers = groups.get(groupName) ?? [];
      groupMembers.push(member);
      groups.set(groupName, groupMembers);
    }
    return Array.from(groups, ([name, members]) => ({ name, members }));
  }

  get visibleMemberCount(): number {
    return this.memberGroups.reduce((count, group) => count + group.members.length, 0);
  }

  getMemberStatusLabel(status?: MemberStatus): string {
    return this.statusOptions.find((option) => option.value === (status ?? 'online'))?.label ?? 'Offline';
  }

  get activeChannelType(): ChannelType {
    return this.activeServer?.categories
      .flatMap((category) => category.channels)
      .find((channel) => channel.name === this.activeChannel)?.type ?? 'text';
  }

  private get activeChannelKey(): string {
    return JSON.stringify([this.activeServer?.name ?? '', this.activeChannel]);
  }

  get canManageServer(): boolean {
    return !!this.activeServer && this.serverStore.canManageServer(this.activeServer, CURRENT_MEMBER_ID);
  }

  get isServerOwner(): boolean {
    return !!this.activeServer && this.serverStore.isServerOwner(this.activeServer, CURRENT_MEMBER_ID);
  }

  openAdminPanel(): void {
    if (!this.canManageServer) {
      return;
    }
    this.closeMemberProfile();
    this.adminPanelOpen = true;
    this.channelError = '';
    this.roleError = '';
    this.adminSection = 'channels';
  }

  createChannel(): void {
    if (!this.activeServer || !this.canManageServer) {
      return;
    }
    if (!this.serverStore.addChannel(
      this.activeServer,
      this.newChannelName,
      this.newChannelType,
      CURRENT_MEMBER_ID,
      this.newChannelCategory || undefined,
    )) {
      this.channelError = 'Enter a unique channel name.';
      return;
    }
    this.newChannelName = '';
    this.newChannelCategory = '';
    this.channelError = '';
  }

  createRole(): void {
    if (!this.activeServer || !this.canManageServer) {
      return;
    }
    if (!this.serverStore.addRole(this.activeServer, this.newRoleName, CURRENT_MEMBER_ID)) {
      this.roleError = 'Enter a unique role name.';
      return;
    }
    this.newRoleName = '';
    this.roleError = '';
  }

  assignMemberRole(member: ServerMember, role: string): void {
    if (!this.activeServer || !this.canManageServer) {
      return;
    }
    this.serverStore.setMemberRole(this.activeServer, member, role || null, CURRENT_MEMBER_ID);
  }

  assignMemberAuthority(member: ServerMember, authority: MemberAuthority): void {
    if (!this.activeServer || !this.isServerOwner || authority === 'owner') {
      return;
    }
    this.serverStore.setMemberAuthority(this.activeServer, member, authority, CURRENT_MEMBER_ID);
  }

  isCurrentMember(member: ServerMember): boolean {
    return member.id === CURRENT_MEMBER_ID;
  }

  closeAdminPanel(): void {
    this.adminPanelOpen = false;
    this.channelError = '';
    this.roleError = '';
  }

  private checkScheduledEvents(): void {
    const today = this.getLocalDateKey(new Date());
    for (const server of this.joinedServers) {
      for (const event of server.events) {
        if (event.date === today && !this.notifiedEventIds.has(event.id)) {
          this.notifiedEventIds.add(event.id);
          this.dueEventQueue.push({ event, serverName: server.name });
        }
      }
    }
    if (!this.activeDueEvent) {
      this.activeDueEvent = this.dueEventQueue.shift() ?? null;
    }
  }

  private getLocalDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  toggleStatusMenu(event: Event): void {
    event.stopPropagation();
      this.accountMenuOpen = !this.accountMenuOpen;
  }

  setStatus(status: (typeof this.statusOptions)[number]['value']): void {
    this.status = status;
    for (const server of this.joinedServers) {
      const currentMember = server.members.find((member) => member.id === CURRENT_MEMBER_ID);
      if (currentMember) {
        currentMember.status = status;
      }
    }
    this.accountMenuOpen = false;
  }

  toggleAccountMenu(event: Event): void {
    event.stopPropagation();
    this.accountMenuOpen = !this.accountMenuOpen;
  }

  openAccountManager(): void {
    this.accountMenuOpen = false;
    this.accountManagerOpen = true;
    this.confirmAccountRemoval = false;
  }

  closeAccountManager(): void {
    this.accountManagerOpen = false;
    this.confirmAccountRemoval = false;
  }

  switchAccount(): void {
    this.accountMenuOpen = false;
    this.closeAccountManager();
    this.router.navigateByUrl('/tabs/login');
  }

  logOut(): void {
    this.closeAccountManager();
    this.accountMenuOpen = false;
    this.accountProfiles.clearActiveAccount();
    this.router.navigateByUrl('/tabs/splash');
  }

  removeAccountFromDevice(): void {
    this.closeAccountManager();
    this.accountMenuOpen = false;
    this.accountProfiles.clearActiveAccount();
    this.router.navigateByUrl('/tabs/splash');
  }
}
