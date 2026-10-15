import { Location } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { FriendsStoreService, type Friend } from '../friends-store.service';
import { ServerStoreService, SERVER_TEMPLATE_CHANNELS, type ServerChannel, type ServerMember, type ServerTemplateId } from '../server-store.service';

@Component({
  selector: 'app-create-server',
  templateUrl: 'create-server.page.html',
  styleUrls: ['create-server.page.scss'],
  standalone: false,
})
export class CreateServerPage implements OnInit {
  serverName = '';
  step: 'template' | 'details' | 'customize' = 'template';
  selectedTemplateId: ServerTemplateId = 'community';
  selectedAccentColor = '#3267d6';
  includeGeneral = true;
  includeWelcome = true;
  includeRules = true;
  includeAnnouncements = true;
  selectedTemplateChannels: Array<ServerChannel & { included: boolean }> = [];
  additionalChannels: Array<{ id: number; name: string }> = [];
  readonly templates = [
    {
      id: 'community',
      name: 'Community',
      description: 'Welcome new members and keep announcements in view.',
      accentColor: '#3267d6',
      includeWelcome: true,
      includeRules: true,
      includeAnnouncements: true,
    },
    {
      id: 'gaming',
      name: 'Gaming',
      description: 'Organize group chats, game nights, and voice hangouts.',
      accentColor: '#177a65',
      includeWelcome: false,
      includeRules: false,
      includeAnnouncements: true,
    },
    {
      id: 'study',
      name: 'Study group',
      description: 'Keep topics, resources, and study sessions together.',
      accentColor: '#8a6100',
      includeWelcome: false,
      includeRules: false,
      includeAnnouncements: false,
    },
    {
      id: 'friends',
      name: 'Friends',
      description: 'A casual space for plans, updates, and inside jokes.',
      accentColor: '#b9413c',
      includeWelcome: false,
      includeRules: false,
      includeAnnouncements: false,
    },
  ] as const;
  readonly accentColors = [
    { name: 'Ocean blue', value: '#3267d6' },
    { name: 'Evergreen', value: '#177a65' },
    { name: 'Coral', value: '#b9413c' },
    { name: 'Amber', value: '#8a6100' },
    { name: 'Slate', value: '#4e5d73' },
    { name: 'Violet', value: '#7650a8' },
  ];
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly serverStore = inject(ServerStoreService);
  private nextAdditionalChannelId = 1;

  ngOnInit(): void {
    const draft = this.serverStore.creationDraft;
    if (!draft) {
      return;
    }

    const templateId = draft.options.templateId ?? 'community';
    const includedChannels = draft.options.includedTemplateChannels;
    const includedChannelKeys = new Set(includedChannels?.map((channel) => `${channel.type}:${channel.name}`));
    this.serverName = draft.name;
    this.selectedTemplateId = templateId;
    this.selectedAccentColor = draft.options.accentColor ?? this.selectedAccentColor;
    this.includeGeneral = draft.options.includeGeneral ?? true;
    this.includeWelcome = draft.options.includeWelcome ?? true;
    this.includeRules = draft.options.includeRules ?? true;
    this.includeAnnouncements = draft.options.includeAnnouncements ?? true;
    this.selectedTemplateChannels = SERVER_TEMPLATE_CHANNELS[templateId].map((channel) => ({
      ...channel,
      included: includedChannels ? includedChannelKeys.has(`${channel.type}:${channel.name}`) : true,
    }));
    this.additionalChannels = (draft.options.additionalChannels ?? []).map((name, index) => ({ id: index + 1, name }));
    this.nextAdditionalChannelId = this.additionalChannels.length + 1;
    this.step = 'customize';
  }

  goBack(): void {
    if (this.step === 'customize') {
      this.step = 'details';
      return;
    }
    if (this.step === 'details') {
      this.step = 'template';
      return;
    }
    this.location.back();
  }

  selectTemplate(templateId: ServerTemplateId): void {
    const template = this.templates.find((item) => item.id === templateId);
    if (!template) {
      return;
    }

    this.selectedTemplateId = template.id;
    this.selectedAccentColor = template.accentColor;
    this.selectedTemplateChannels = SERVER_TEMPLATE_CHANNELS[templateId].map((channel) => ({ ...channel, included: true }));
    this.includeWelcome = template.includeWelcome;
    this.includeRules = template.includeRules;
    this.includeAnnouncements = template.includeAnnouncements;
  }

  continueToDetails(): void {
    this.step = 'details';
  }

  continueToCustomize(): void {
    if (this.serverName.trim()) {
      this.step = 'customize';
    }
  }

  addAdditionalChannel(): void {
    this.additionalChannels.push({ id: this.nextAdditionalChannelId, name: '' });
    this.nextAdditionalChannelId += 1;
  }

  removeAdditionalChannel(channelId: number): void {
    this.additionalChannels = this.additionalChannels.filter((channel) => channel.id !== channelId);
  }

  openInviteStep(): void {
    const name = this.serverName.trim();
    if (!name) {
      return;
    }
    this.serverStore.saveCreationDraft(name, this.getCreationOptions());
    void this.router.navigateByUrl('/create-server/invite');
  }

  createServer(): void {
    const name = this.serverName.trim();
    if (!name) {
      return;
    }

    this.serverStore.addServer(name, this.getCreationOptions());
    this.serverStore.clearCreationDraft();
    void this.router.navigateByUrl('/create-server/share');
  }

  private getCreationOptions() {
    return {
      templateId: this.selectedTemplateId,
      accentColor: this.selectedAccentColor,
      includeGeneral: this.includeGeneral,
      includeWelcome: this.includeWelcome,
      includeRules: this.includeRules,
      includeAnnouncements: this.includeAnnouncements,
      includedTemplateChannels: this.selectedTemplateChannels
        .filter((channel) => channel.included)
        .map(({ name: channelName, type }) => ({ name: channelName, type })),
      additionalChannels: this.additionalChannels.map((channel) => channel.name),
    };
  }
}

@Component({
  selector: 'app-add-server-friends',
  template: `
    <ion-content [fullscreen]="true" class="create-server-screen">
      <main class="create-server-content">
        <button class="back-button" type="button" (click)="goBack()">Back to setup</button>
        <p class="step-indicator">STEP 4 OF 4 · OPTIONAL</p>
        <h1>Add friends</h1>
        <p>Choose friends to add to {{ serverName }}, or finish without anyone.</p>

        @if (friends.length) {
          <label class="friend-search-field">
            <span>Search friends</span>
            <input type="search" name="friendSearch" [(ngModel)]="friendSearch" placeholder="Search your friends" autocomplete="off" />
          </label>

          @if (filteredFriends.length) {
            <div class="friend-picker" aria-label="Your friends">
              @for (friend of filteredFriends; track friend.id) {
                <label class="friend-option">
                  <input type="checkbox" [checked]="isFriendSelected(friend.id)" (change)="toggleFriend(friend.id)" />
                  <span class="friend-avatar" aria-hidden="true">{{ friend.initial }}</span>
                  <span class="friend-identity"><strong>{{ friend.name }}</strong><span>{{ friend.status }}</span></span>
                </label>
              }
            </div>
          } @else {
            <p class="friend-list-message" role="status">No friends match that search.</p>
          }
        } @else {
          <p class="friend-list-message" role="status">You do not have any friends to add yet.</p>
        }

        <button class="create-button" type="button" (click)="createServer()">
          {{ selectedFriendIds.length ? 'Create server and add friends' : 'Create server without adding friends' }}
        </button>
      </main>
    </ion-content>
  `,
  styles: [`
    .friend-search-field { display: block; margin: 24px 0 16px; }
    .friend-search-field > span { color: #666666; display: block; font-size: 12px; margin: 0 0 6px 2px; }
    .friend-search-field input { background: #f4f5f9; border: 1px solid #dedfe5; border-radius: 9px; box-sizing: border-box; color: #333333; font: inherit; height: 40px; padding: 0 10px; width: 100%; }
    .friend-picker { display: grid; gap: 8px; margin-bottom: 20px; }
    .friend-option { align-items: center; background: #f4f5f9; border: 1px solid #dedfe5; border-radius: 8px; color: #333333; cursor: pointer; display: flex; gap: 10px; min-height: 58px; padding: 8px 10px; }
    .friend-option > input { accent-color: #3267d6; height: 16px; width: 16px; }
    .friend-avatar { align-items: center; background: #d8e1f2; border-radius: 50%; color: #344c74; display: inline-flex; flex: 0 0 34px; font-size: 13px; font-weight: 700; height: 34px; justify-content: center; }
    .friend-identity { display: flex; flex-direction: column; gap: 3px; }
    .friend-identity strong { font-size: 13px; }
    .friend-identity > span, .friend-list-message { color: #70737c; font-size: 12px; }
    .friend-list-message { margin: 16px 0 24px; }
    button:focus-visible, .friend-search-field input:focus-visible { outline: 2px solid #555555; outline-offset: 2px; }
  `],
  standalone: false,
})
export class AddServerFriendsPage implements OnInit {
  friendSearch = '';
  selectedFriendIds: number[] = [];
  private readonly friendsStore = inject(FriendsStoreService);
  private readonly router = inject(Router);
  private readonly serverStore = inject(ServerStoreService);

  ngOnInit(): void {
    const draft = this.serverStore.creationDraft;
    if (!draft) {
      void this.router.navigateByUrl('/create-server');
      return;
    }
    this.selectedFriendIds = [...draft.selectedFriendIds];
  }

  get friends(): Friend[] {
    return this.friendsStore.friends;
  }

  get serverName(): string {
    return this.serverStore.creationDraft?.name ?? '';
  }

  get filteredFriends(): Friend[] {
    const query = this.friendSearch.trim().toLocaleLowerCase();
    return this.friends.filter((friend) => friend.name.toLocaleLowerCase().includes(query));
  }

  isFriendSelected(friendId: number): boolean {
    return this.selectedFriendIds.includes(friendId);
  }

  toggleFriend(friendId: number): void {
    this.selectedFriendIds = this.isFriendSelected(friendId)
      ? this.selectedFriendIds.filter((selectedId) => selectedId !== friendId)
      : [...this.selectedFriendIds, friendId];

    if (this.serverStore.creationDraft) {
      this.serverStore.creationDraft.selectedFriendIds = [...this.selectedFriendIds];
    }
  }

  goBack(): void {
    void this.router.navigateByUrl('/create-server');
  }

  createServer(): void {
    const draft = this.serverStore.creationDraft;
    if (!draft) {
      void this.router.navigateByUrl('/create-server');
      return;
    }

    const invitedMembers = this.friends
      .filter((friend) => this.selectedFriendIds.includes(friend.id))
      .map((friend): ServerMember => ({
        id: `friend-${friend.id}`,
        name: friend.name,
        authority: 'member',
        status: friend.status === 'Online' ? 'online' : friend.status === 'Idle' ? 'idle' : 'invisible',
      }));
    this.serverStore.addServer(draft.name, { ...draft.options, invitedMembers });
    this.serverStore.clearCreationDraft();
    void this.router.navigateByUrl('/create-server/share');
  }
}

@Component({
  selector: 'app-server-invite',
  template: `
    <ion-content [fullscreen]="true" class="create-server-screen">
      <main class="create-server-content">
        <p class="step-indicator">SERVER CREATED</p>
        <h1>Invite people to {{ serverName }}</h1>
        <p>Share this link with people you want to invite.</p>

        <label class="invite-link-field">
          <span>Invite link</span>
          <input type="text" [value]="inviteLink" readonly />
        </label>
        <p class="invite-status" role="status" aria-live="polite">{{ inviteStatus }}</p>

        <button class="create-button" type="button" (click)="copyInviteLink()">Copy invite link</button>
        @if (canShare) {
          <button class="share-button" type="button" (click)="shareInvite()">Share invite</button>
        }
        <button class="continue-button" type="button" (click)="goToServer()">Continue to server</button>
      </main>
    </ion-content>
  `,
  styles: [`
    .invite-link-field { display: block; margin: 24px 0 4px; }
    .invite-link-field > span { color: #666666; display: block; font-size: 12px; margin: 0 0 6px 2px; }
    .invite-link-field input { background: #f4f5f9; border: 1px solid #dedfe5; border-radius: 9px; box-sizing: border-box; color: #333333; font: inherit; height: 42px; padding: 0 10px; width: 100%; }
    .invite-status { color: #666666; font-size: 12px; min-height: 18px; margin: 6px 0 12px; }
    .share-button, .continue-button { background: #f4f5f9; border: 1px solid #dedfe5; border-radius: 11px; color: #333333; font: inherit; height: 40px; margin-top: 10px; padding: 0 14px; text-align: left; width: 100%; }
    button:focus-visible, .invite-link-field input:focus-visible { outline: 2px solid #555555; outline-offset: 2px; }
  `],
  standalone: false,
})
export class ServerInvitePage implements OnInit {
  inviteStatus = '';
  private readonly router = inject(Router);
  private readonly serverStore = inject(ServerStoreService);

  ngOnInit(): void {
    if (!this.serverStore.activeServer) {
      void this.router.navigateByUrl('/home');
    }
  }

  get serverName(): string {
    return this.serverStore.activeServer?.name ?? '';
  }

  get inviteLink(): string {
    const inviteCode = this.serverStore.activeServer?.inviteCode;
    return inviteCode ? `${window.location.origin}/invite/${encodeURIComponent(inviteCode)}` : '';
  }

  get canShare(): boolean {
    return typeof navigator.share === 'function';
  }

  async copyInviteLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.inviteLink);
      this.inviteStatus = 'Invite link copied.';
    } catch {
      this.inviteStatus = 'Could not copy the link. Select it above and copy it manually.';
    }
  }

  async shareInvite(): Promise<void> {
    try {
      await navigator.share({
        title: `Join ${this.serverName}`,
        text: `Join my server, ${this.serverName}.`,
        url: this.inviteLink,
      });
      this.inviteStatus = 'Invite shared.';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      this.inviteStatus = 'Could not share the invite. Copy the link instead.';
    }
  }

  goToServer(): void {
    void this.router.navigateByUrl('/home');
  }
}
