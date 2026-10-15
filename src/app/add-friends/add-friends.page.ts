import { Location } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FriendsStoreService, type Friend } from '../friends-store.service';

type ChatMessage = { sender: 'you'; text: string };

@Component({
  selector: 'app-add-friends',
  templateUrl: 'add-friends.page.html',
  styleUrls: ['add-friends.page.scss'],
  standalone: false,
})
export class AddFriendsPage {
  activeFriend: Friend | null = null;
  messageText = '';
  messages: Record<number, ChatMessage[]> = {};
  isAddingFriend = false;
  friendName = '';
  private readonly location = inject(Location);
  private readonly friendsStore = inject(FriendsStoreService);

  get friends(): Friend[] {
    return this.friendsStore.friends;
  }

  goBack(): void {
    this.location.back();
  }

  openChat(friend: Friend): void {
    this.activeFriend = friend;
  }

  closeChat(): void {
    this.activeFriend = null;
    this.messageText = '';
  }

  sendMessage(): void {
    const text = this.messageText.trim();
    if (!text || !this.activeFriend) {
      return;
    }

    const friendId = this.activeFriend.id;
    this.messages = {
      ...this.messages,
      [friendId]: [...(this.messages[friendId] ?? []), { sender: 'you', text }],
    };
    this.messageText = '';
  }

  toggleAddFriend(): void {
    this.isAddingFriend = !this.isAddingFriend;
  }

  addFriend(): void {
    const name = this.friendName.trim();
    if (!name) {
      return;
    }

    this.friendsStore.addFriend(name);
    this.friendName = '';
    this.isAddingFriend = false;
  }
}
