export const INSTALL_LINES = [
  "git clone https://github.com/imariusalin/keel.git",
  "cd keel",
  "sudo bash install.sh",
] as const;

export const INSTALL_CMD = INSTALL_LINES.join(" && ");
