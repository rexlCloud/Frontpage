import cloud from './generated/cloud.json';

/**
 * Links and contact details; change them here.
 */
export const site = {
  name: 'rexlCloud',
  url: 'https://rexlcloud.de',
  // TODO: replace with the real invite link
  discord: 'https://discord.gg/REPLACE-ME',
  email: 'contact@rexlcloud.de',
  panel: 'https://web.rexlcloud.de',
  repository: cloud.repository,
};

export type Artifact = 'launcher' | 'restmodule' | 'bridge' | 'proxy';

/** The newest release, read from repo.rexlcloud.de when the site is built. */
export const release = cloud as {
  version: string;
  releasedAt: string | null;
  repository: string;
  jars: Record<Artifact, string>;
  apis: { artifact: string; version: string }[];
};
