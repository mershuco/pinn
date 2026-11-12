"""Deploy the isolated IF site. Credentials stay in the deployment process only."""
import json
import os
import re
import sys
import urllib.error
import urllib.request
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast'
SCRIPT = 'orv-if-pinn'


def main():
    token = os.environ.get('ORV_CF_API_TOKEN', '')
    account = os.environ.get('ORV_CF_ACCOUNT_ID', '')
    if not token or not re.fullmatch(r'[a-fA-F0-9]{32}', account):
        sys.exit('배포 대기: 환경 설정에 ORV_CF_API_TOKEN과 32자리 ORV_CF_ACCOUNT_ID를 등록해 적용해 주세요. 비밀값은 채팅에 보내지 마세요.')

    def api(path, method='GET', body=None, content_type='application/json', missing_ok=False):
        data = json.dumps(body).encode() if isinstance(body, dict) else body
        req = urllib.request.Request('https://api.cloudflare.com/client/v4' + path, data=data, method=method,
                                     headers={'Authorization': 'Bearer ' + token, 'Content-Type': content_type})
        try:
            with urllib.request.urlopen(req, timeout=60) as response:
                result = json.load(response)
        except urllib.error.HTTPError as error:
            if missing_ok and error.code == 404:
                return None
            # Never echo provider bodies or request headers containing credentials.
            sys.exit(f'Cloudflare 요청 실패 (HTTP {error.code}). 계정 ID, 토큰의 계정 범위 및 Workers Scripts 편집 / Workers AI 실행 권한을 확인해 주세요.')
        except urllib.error.URLError:
            sys.exit('Cloudflare 연결 실패. 환경 네트워크 설정을 확인해 주세요.')
        if not result.get('success'):
            sys.exit('Cloudflare가 요청을 거부했습니다. 계정 설정과 API 토큰 권한을 확인해 주세요.')
        return result.get('result')

    base = f'/accounts/{account}/workers'
    subdomain = api(base + '/subdomain')
    if not subdomain or not subdomain.get('subdomain'):
        sys.exit('계정의 workers.dev 하위 도메인이 없습니다. Cloudflare 대시보드 → Workers & Pages에서 하위 도메인을 먼저 설정해 주세요.')

    # This project uses a dedicated Worker and does not modify the existing game.
    existing = api(base + f'/scripts/{SCRIPT}/settings', missing_ok=True)
    if existing and 'orv-if-pinn-project' not in existing.get('tags', []):
        sys.exit('같은 이름의 다른 Worker가 존재합니다. 덮어쓰지 않았습니다. scripts/deploy.py의 SCRIPT 이름을 바꾸세요.')

    metadata = {
        'main_module': 'worker.mjs', 'compatibility_date': '2026-11-12',
        'tags': ['orv-if-pinn-project'],
        'bindings': [
            {'type': 'ai', 'name': 'AI'},
            {'type': 'plain_text', 'name': 'AI_MODEL', 'text': MODEL},
            {'type': 'ratelimit', 'name': 'AI_RATE_LIMITER', 'namespace_id': '731026',
             'simple': {'limit': 5, 'period': 60}}
        ]
    }
    boundary = 'orv-if-' + uuid.uuid4().hex
    parts = []

    def part(name, data, content_type, filename=None):
        disposition = f'Content-Disposition: form-data; name="{name}"'
        if filename:
            disposition += f'; filename="{filename}"'
        parts.append((f'--{boundary}\r\n{disposition}\r\nContent-Type: {content_type}\r\n\r\n').encode() + data + b'\r\n')

    part('metadata', json.dumps(metadata).encode(), 'application/json')
    for file in ['worker.mjs', 'service.mjs', 'knowledge.mjs', 'assets.mjs']:
        part(file, (ROOT / 'build' / file).read_bytes(), 'application/javascript+module', file)
    body = b''.join(parts) + f'--{boundary}--\r\n'.encode()
    api(base + f'/scripts/{SCRIPT}', 'PUT', body, f'multipart/form-data; boundary={boundary}')
    api(base + f'/scripts/{SCRIPT}/subdomain', 'POST', {'enabled': True, 'previews_enabled': False})
    url = f'https://{SCRIPT}.{subdomain["subdomain"]}.workers.dev'
    report = {'url': url, 'script': SCRIPT, 'provider': 'Cloudflare Workers AI', 'model': MODEL,
              'status': 'deployed_pending_live_ai_verification'}
    (ROOT / 'deployment.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print('게시됨: ' + url)
    print('다음 확인: /api/health 및 실제 /api/predict 응답. 아직 실제 AI 검증 완료를 뜻하지 않습니다.')


if __name__ == '__main__':
    main()
