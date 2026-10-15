import { Injectable } from '@angular/core';

export interface Friend {
  id: number;
  name: string;
  status: string;
  initial: string;
}

@Injectable({ providedIn: 'root' })
export class FriendsStoreService {
  readonly friends: Friend[] = [
    { id: 1, name: 'Alex Morgan', status: 'Online', initial: 'A' },
    { id: 2, name: 'Jordan Lee', status: 'Idle', initial: 'J' },
    { id: 3, name: 'Sam Rivera', status: 'Offline', initial: 'S' },
  ];
  private nextFriendId = 4;

  addFriend(name: string): void {
    const normalizedName = name.trim();
    if (!normalizedName || this.friends.some((friend) => friend.name.toLowerCase() === normalizedName.toLowerCase())) {
      return;
    }

    this.friends.push({
      id: this.nextFriendId++,
      name: normalizedName,
      status: 'Pending',
      initial: normalizedName.charAt(0).toUpperCase(),
    });
  }
}