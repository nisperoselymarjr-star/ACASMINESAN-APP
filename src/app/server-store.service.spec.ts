import { CURRENT_MEMBER_ID, ServerStoreService } from './server-store.service';

describe('ServerStoreService', () => {
  let service: ServerStoreService;

  beforeEach(() => {
    service = new ServerStoreService();
    service.addServer('Test server');
  });

  it('allows the owner to create categories and place channels in them', () => {
    const server = service.activeServer;
    if (!server) {
      throw new Error('Expected a server to be created.');
    }

    expect(service.addCategory(server, 'Games', CURRENT_MEMBER_ID)).toBe(true);
    expect(service.addChannel(server, 'party-room', 'voice', CURRENT_MEMBER_ID, 'Games')).toBe(true);
    expect(server.categories.find((category) => category.name === 'Games')?.channels).toEqual([
      { name: 'party-room', type: 'voice' },
    ]);
  });

  it('rejects duplicate categories and channels assigned to unknown categories', () => {
    const server = service.activeServer;
    if (!server) {
      throw new Error('Expected a server to be created.');
    }

    expect(service.addCategory(server, 'Games', CURRENT_MEMBER_ID)).toBe(true);
    expect(service.addCategory(server, 'games', CURRENT_MEMBER_ID)).toBe(false);
    expect(service.addChannel(server, 'party-room', 'voice', CURRENT_MEMBER_ID, 'Missing')).toBe(false);
  });

  it('creates scheduled events for the owner and rejects invalid dates', () => {
    const server = service.activeServer;
    if (!server) {
      throw new Error('Expected a server to be created.');
    }
    const today = new Date();
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    expect(service.addEvent(server, 'Game night', date, 'Bring a friend.', CURRENT_MEMBER_ID)).toBe(true);
    expect(server.events).toHaveLength(1);
    expect(service.addEvent(server, 'Invalid event', 'not-a-date', '', CURRENT_MEMBER_ID)).toBe(false);
  });

  it('prevents regular members from creating categories and events', () => {
    const server = service.activeServer;
    if (!server) {
      throw new Error('Expected a server to be created.');
    }
    server.members.push({ id: 'member-1', name: 'Member', authority: 'member' });

    expect(service.addCategory(server, 'Games', 'member-1')).toBe(false);
    expect(service.addEvent(server, 'Game night', '2026-10-15', '', 'member-1')).toBe(false);
  });

  it('allows only the owner to delete a server and selects a remaining server', () => {
    const deletedServer = service.activeServer;
    if (!deletedServer) {
      throw new Error('Expected a server to be created.');
    }
    service.addServer('Another server');
    const remainingServer = service.activeServer;
    if (!remainingServer) {
      throw new Error('Expected the second server to be created.');
    }

    expect(service.deleteServer(deletedServer, 'member-1')).toBe(false);
    expect(service.deleteServer(deletedServer, CURRENT_MEMBER_ID)).toBe(true);
    expect(service.servers).toEqual([remainingServer]);
    expect(service.activeServer).toBe(remainingServer);
  });

  it('allows admins and owners to delete channels but rejects members and unknown channels', () => {
    const server = service.activeServer;
    if (!server) {
      throw new Error('Expected a server to be created.');
    }
    const lobbyCategory = server.categories.find((category) =>
      category.channels.some((channel) => channel.name === 'Main Lobby'));
    if (!lobbyCategory) {
      throw new Error('Expected the default lobby category to exist.');
    }
    server.members.push({ id: 'admin-1', name: 'Admin', authority: 'admin' });
    server.members.push({ id: 'member-1', name: 'Member', authority: 'member' });

    expect(service.deleteChannel(server, 'Main Lobby', 'member-1')).toBe(false);
    expect(service.deleteChannel(server, 'Missing Lobby', 'admin-1')).toBe(false);
    expect(service.deleteChannel(server, 'Main Lobby', 'admin-1')).toBe(true);
    expect(lobbyCategory.channels).toEqual([]);
    expect(server.categories).toContain(lobbyCategory);
  });
});
