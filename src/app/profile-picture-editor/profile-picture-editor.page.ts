import { Location } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnDestroy } from '@angular/core';
import { AccountProfile, AccountProfileStoreService } from '../account-profile-store.service';

@Component({
  selector: 'app-profile-picture-editor',
  templateUrl: 'profile-picture-editor.page.html',
  styleUrls: ['profile-picture-editor.page.scss'],
  standalone: false,
})
export class ProfilePictureEditorPage implements OnDestroy {
  profileImage: string | null = null;
  previewUrl: string | null = null;
  private pendingImageFile: File | null = null;
  bio = 'Building communities and sharing what I am into.';
  bioDraft = this.bio;
  displayName = '';
  displayNameDraft = '';
  isEditingBio = false;
  connectionName = '';
  connections: string[] = [];
  savedConnections: string[] = [];
  isSaving = false;
  saveMessage = '';
  saveError = '';
  private readonly location = inject(Location);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly accountProfiles = inject(AccountProfileStoreService);

  constructor() {
    this.loadProfile();
  }

  get hasPendingChanges(): boolean {
    return this.previewUrl !== this.profileImage
      || this.displayNameDraft.trim() !== this.displayName
      || this.bioDraft.trim() !== this.bio
      || JSON.stringify(this.connections) !== JSON.stringify(this.savedConnections)
      || !!this.connectionName.trim();
  }

  goBack(): void {
    this.location.back();
  }

  ngOnDestroy(): void {
    this.releasePreviewUrl();
  }

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      this.saveError = 'Choose an image file.';
      return;
    }

    this.releasePreviewUrl();
    this.previewUrl = URL.createObjectURL(file);
    this.pendingImageFile = file;
    this.saveError = '';
    this.saveMessage = '';
  }

  startEditingBio(): void {
    this.bioDraft = this.bio;
    this.isEditingBio = true;
  }

  finishBioEdit(): void {
    this.bioDraft = this.bioDraft.trim();
    this.isEditingBio = false;
  }

  cancelBioEdit(): void {
    this.bioDraft = this.bio;
    this.isEditingBio = false;
  }

  addConnection(): void {
    const connection = this.connectionName.trim();
    if (!connection) {
      return;
    }

    if (!this.connections.includes(connection)) {
      this.connections = [...this.connections, connection];
    }
    this.connectionName = '';
  }

  async saveChanges(): Promise<void> {
    if (this.isSaving || !this.hasPendingChanges) {
      return;
    }

    this.isSaving = true;
    this.saveError = '';
    const pendingConnection = this.connectionName.trim();
    const connections = pendingConnection && !this.connections.includes(pendingConnection)
      ? [...this.connections, pendingConnection]
      : [...this.connections];
    const bio = this.bioDraft.trim();
    const displayName = this.displayNameDraft.trim() || 'Komyunity member';

    try {
      const avatar = this.pendingImageFile
        ? await this.createOptimizedImage(this.pendingImageFile)
        : this.previewUrl;
      const profile: AccountProfile = { avatar, bio, connections, displayName };
      this.accountProfiles.saveProfile(profile);

      this.releasePreviewUrl();
      this.profileImage = avatar;
      this.previewUrl = avatar;
      this.pendingImageFile = null;
      this.bio = bio;
      this.bioDraft = bio;
      this.displayName = displayName;
      this.displayNameDraft = displayName;
      this.connections = connections;
      this.savedConnections = [...connections];
      this.connectionName = '';
      this.isEditingBio = false;
      this.saveMessage = 'Profile changes saved on this device.';
    } catch {
      this.saveError = this.pendingImageFile
        ? 'Could not prepare or save the image. Try a smaller image.'
        : 'Could not save changes on this device.';
      this.saveMessage = '';
    } finally {
      this.isSaving = false;
      this.changeDetector.markForCheck();
    }
  }

  private async createOptimizedImage(file: File): Promise<string> {
    const imageUrl = URL.createObjectURL(file);
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const element = new Image();
        const timeout = setTimeout(() => reject(new Error('Image decoding timed out')), 15000);
        element.onload = () => {
          clearTimeout(timeout);
          resolve(element);
        };
        element.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('Image decoding failed'));
        };
        element.src = imageUrl;
      });
      const scale = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) {
        throw new Error('Canvas is unavailable');
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.82);
    } finally {
      URL.revokeObjectURL(imageUrl);
    }
  }

  private releasePreviewUrl(): void {
    if (this.previewUrl?.startsWith('blob:')) {
      URL.revokeObjectURL(this.previewUrl);
    }
  }

  private loadProfile(): void {
    const profile = this.accountProfiles.loadProfile();
    const fallbackName = this.accountProfiles.getActiveAccountIdentifier() || 'Komyunity member';
    if (!profile) {
      this.displayName = fallbackName;
      this.displayNameDraft = fallbackName;
      return;
    }

    this.profileImage = profile.avatar;
    this.previewUrl = this.profileImage;
    this.bio = profile.bio || this.bio;
    this.bioDraft = this.bio;
    this.displayName = profile.displayName || fallbackName;
    this.displayNameDraft = this.displayName;
    this.connections = profile.connections;
    this.savedConnections = [...this.connections];
  }
}