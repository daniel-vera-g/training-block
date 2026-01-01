export interface GitHubConfig {
    token: string;
    owner: string;
    repo: string;
    branch: string;
    path: string;
}

export const saveToGitHub = async (config: GitHubConfig, content: string): Promise<boolean> => {
    const { token, owner, repo, branch, path } = config;
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

    try {
        // 1. Get current file SHA (needed for update)
        // Add cache busting to ensure we get the latest SHA
        const timestamp = new Date().getTime();
        const getRes = await fetch(`${apiUrl}?ref=${branch}&t=${timestamp}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Cache-Control': 'no-store, no-cache, must-revalidate',
                'Pragma': 'no-cache',
            },
        });

        if (!getRes.ok) {
            console.error('Failed to fetch file info from GitHub');
            throw new Error(`GitHub API Error: ${getRes.status} ${getRes.statusText}`);
        }

        const getData = await getRes.json();
        const sha = getData.sha;

        // 2. Update file
        // Content must be Base64 encoded
        // Use btoa for simple ASCII, but for UTF-8 safety we might need a workaround if emojis are used.
        // For this CSV, standard btoa is likely fine, but let's be safe with UTF-8.
        const base64Content = btoa(
            new TextEncoder()
                .encode(content)
                .reduce((data, byte) => data + String.fromCharCode(byte), '')
        );

        const putRes = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                message: `chore: Update training plan via web app`,
                content: base64Content,
                sha: sha,
                branch: branch,
            }),
        });

        if (!putRes.ok) {
            console.error('Failed to update file on GitHub');
            throw new Error(`GitHub API Error: ${putRes.status} ${putRes.statusText}`);
        }

        return true;
    } catch (e) {
        console.error('GitHub Save Error:', e);
        throw e;
    }
};
