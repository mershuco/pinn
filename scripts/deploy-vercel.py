"""Deploy into an already connected Vercel project, using its stored AI key."""
import json
import os
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DEPLOY_URL = 'https://vercel.com/new/clone?' + urllib.parse.urlencode({
    'repository-url': 'https://github.com/mershuco/pinn/tree/orv-if-site',
    'project-name': 'orv-if-pinn', 'repository-name': 'orv-if-site',
    'env': 'OPENAI_API_KEY',
    'envDescription': '운영용 OpenAI API 키. 서버에서만 사용합니다. 브라우저에 공개되지 않습니다.',
    'envLink': 'https://platform.openai.com/api-keys'
})


def main():
    token = os.environ.get('ORV_VERCEL_TOKEN', '')
    project = os.environ.get('ORV_VERCEL_PROJECT_ID', '')
    if not token or not project:
        print('Vercel 계정과 AI 키 연결이 필요합니다. 아래 링크에서 로그인하고 OPENAI_API_KEY를 입력해 Deploy를 누르세요.')
        print(DEPLOY_URL)
        sys.exit(1)
    team = os.environ.get('ORV_VERCEL_TEAM_ID', '')

    def api(path, method='GET', body=None):
        if team:
            path += ('&' if '?' in path else '?') + urllib.parse.urlencode({'teamId': team})
        request = urllib.request.Request('https://api.vercel.com' + path,
            data=None if body is None else json.dumps(body).encode(), method=method,
            headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            sys.exit(f'Vercel 요청 실패 (HTTP {error.code}). 연결된 프로젝트와 배포 토큰 권한을 확인해 주세요.')
        except urllib.error.URLError:
            sys.exit('Vercel 연결 실패. 네트워크 설정을 확인해 주세요.')

    info = api('/v9/projects/' + urllib.parse.quote(project, safe=''))
    variables = api('/v10/projects/' + urllib.parse.quote(project, safe='') + '/env')
    if not any(v.get('key') == 'OPENAI_API_KEY' and 'production' in v.get('target', []) for v in variables.get('envs', [])):
        sys.exit('Vercel 프로젝트의 Settings → Environment Variables에 Production용 OPENAI_API_KEY를 등록해 주세요.')
    files = []
    for folder in ['api', 'server', 'public', 'scripts']:
        for path in sorted((ROOT / folder).rglob('*')):
            if path.is_file() and path.suffix in ['.mjs', '.js', '.html', '.css', '.svg']:
                files.append({'file': path.relative_to(ROOT).as_posix(), 'data': path.read_text(), 'encoding': 'utf-8'})
    for name in ['package.json', 'vercel.json']:
        files.append({'file': name, 'data': (ROOT / name).read_text(), 'encoding': 'utf-8'})
    result = api('/v13/deployments', 'POST', {'name': info['name'], 'project': info['id'], 'target': 'production',
        'files': files, 'projectSettings': {'framework': None, 'buildCommand': 'npm run build:vercel',
        'outputDirectory': 'public', 'nodeVersion': '24.x'}})
    report = {'provider': 'Vercel', 'deploymentId': result['id'], 'url': 'https://' + result['url'],
              'status': result.get('readyState', 'BUILDING'), 'liveAiVerified': False}
    (ROOT / 'deployment-vercel.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print('Vercel 배포 요청 완료: ' + report['url'])
    print('빌드 완료 후 화면과 실제 AI 응답 검증이 필요합니다.')


if __name__ == '__main__':
    main()
