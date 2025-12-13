export type RoomSummary = {
	id: string;
	name: string;
	playerCount?: number;
	status?: string;
	hostId?: string | null;
	hostName?: string | null;
	currentChart?: {
		coverUrl?: string | null;
		name?: string | null;
		artist?: string | null;
		difficultyName?: string | null;
	} | null;
	isPasswordProtected?: boolean;
	owner?: { id: string; name?: string | null; avatarUrl?: string | null } | null;
};

export type RoomState = {
	id: string;
	name?: string;
	hostId?: string | null;
	hostName?: string | null;
	status?: string;
	startTime?: number;
	currentChart?: {
		coverUrl?: string;
		name?: string;
		artist?: string;
		difficulty?: string;
		songId?: string;
		difficulties?: string[];
	};
	players: Array<{ userId: string; username?: string | null; avatarUrl?: string | null }>;
};

