export async function getLatestRelease(org, repo) {
  let resp = await fetch(
    `https://api.github.com/repos/${org}/${repo}/releases/latest`,
  );
  let body = await resp.json();
  return body.tag_name;
}
