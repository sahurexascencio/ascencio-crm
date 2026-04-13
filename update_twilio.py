import urllib.request, urllib.parse, json, time, sys, os

def load_env(path):
    env = {}
    try:
        with open(path) as f:
            for line in f:
                line = line.strip()
                if '=' in line and not line.startswith('#'):
                    k, v = line.split('=', 1)
                    env[k.strip()] = v.strip()
    except: pass
    return env

def twilio_post(url, sid, token, data):
    auth = (sid + ':' + token).encode()
    import base64
    headers = {'Authorization': 'Basic ' + base64.b64encode(auth).decode(), 'Content-Type': 'application/x-www-form-urlencoded'}
    body = urllib.parse.urlencode(data).encode()
    req = urllib.request.Request(url, data=body, headers=headers, method='POST')
    try:
        urllib.request.urlopen(req, timeout=10)
        return True
    except Exception as e:
        print('  Error:', e)
        return False

# Load env
env_path = os.path.join(os.path.dirname(__file__), 'backend', '.env')
env = load_env(env_path)
sid   = env.get('TWILIO_ACCOUNT_SID', '')
token = env.get('TWILIO_AUTH_TOKEN', '')
app   = env.get('TWILIO_TWIML_APP_SID', '')

if not sid or not token:
    print('ERROR: TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN missing from backend/.env')
    sys.exit(1)

# Wait for tunnel
print('Waiting for tunnel URL...')
tunnel = None
for i in range(20):
    try:
        r = urllib.request.urlopen('http://localhost:20241/quicktunnel', timeout=3)
        data = json.loads(r.read())
        tunnel = 'https://' + data['hostname']
        break
    except:
        time.sleep(2)

if not tunnel:
    print('Could not detect tunnel URL after 40s.')
    print('Copy URL from the tunnel window and update Twilio manually.')
    sys.exit(1)

print(f'\nTunnel: {tunnel}')

# Update TwiML App
if app:
    url = f'https://api.twilio.com/2010-04-01/Accounts/{sid}/Applications/{app}.json'
    if twilio_post(url, sid, token, {'VoiceUrl': tunnel + '/calls/twiml'}):
        print(f'[OK] TwiML App: {tunnel}/calls/twiml')

# Get phone number SID
try:
    import base64
    auth = base64.b64encode((sid+':'+token).encode()).decode()
    req = urllib.request.Request(f'https://api.twilio.com/2010-04-01/Accounts/{sid}/IncomingPhoneNumbers.json',
        headers={'Authorization': 'Basic ' + auth})
    r = urllib.request.urlopen(req, timeout=10)
    numbers = json.loads(r.read())
    phone_sid = numbers['incoming_phone_numbers'][0]['sid']
    url = f'https://api.twilio.com/2010-04-01/Accounts/{sid}/IncomingPhoneNumbers/{phone_sid}.json'
    if twilio_post(url, sid, token, {'SmsUrl': tunnel + '/messages/incoming'}):
        print(f'[OK] SMS: {tunnel}/messages/incoming')
except Exception as e:
    print('  SMS update failed:', e)

print('\nAll done!')
