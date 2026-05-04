#!/usr/bin/env python3
"""
Auto-update script for 365 Days of Code tracker.
Scans git commits and generates log.json for the dashboard.

Usage: python3 update_tracker.py
Run this after committing, or add it as a git hook.
"""

import subprocess
import json
import os
from datetime import datetime, timedelta

REPO_DIR = os.path.dirname(os.path.abspath(__file__))
LOG_FILE = os.path.join(REPO_DIR, 'tracker', 'log.json')
START_DATE = datetime(2026, 5, 4)

def get_git_log():
    """Get all commits with dates and messages."""
    try:
        result = subprocess.run(
            ['git', 'log', '--pretty=format:%H|%ai|%s', '--reverse'],
            capture_output=True, text=True, cwd=REPO_DIR
        )
        if result.returncode != 0:
            return []
        
        commits = []
        for line in result.stdout.strip().split('\n'):
            if not line:
                continue
            parts = line.split('|', 2)
            if len(parts) == 3:
                commits.append({
                    'hash': parts[0],
                    'date': parts[1].strip(),
                    'message': parts[2].strip()
                })
        return commits
    except FileNotFoundError:
        print("Git not found. Make sure git is installed.")
        return []

def commit_to_day(commit_date_str):
    """Convert commit date to day number (1-365)."""
    date = datetime.fromisoformat(commit_date_str.replace(' ', 'T'))
    date = date.replace(hour=0, minute=0, second=0, microsecond=0, tzinfo=None)
    start = START_DATE.replace(hour=0, minute=0, second=0, microsecond=0)
    diff = (date - start).days
    return max(1, min(diff + 1, 365))

def extract_topic(message):
    """Try to extract a topic from commit message."""
    msg = message.lower()
    # Common patterns: "day X: topic", "[topic] message", "topic: message"
    if ':' in message:
        return message.split(':')[0].strip()
    if message.startswith('[') and ']' in message:
        return message[1:message.index(']')].strip()
    return message[:50]

def generate_log():
    """Generate log.json from git commits."""
    commits = get_git_log()
    if not commits:
        print("No commits found.")
        return

    # Group commits by day
    days = {}
    for commit in commits:
        day_num = commit_to_day(commit['date'])
        if day_num not in days:
            days[day_num] = {
                'id': f"git_{commit['hash'][:8]}",
                'dayNumber': day_num,
                'date': datetime.fromisoformat(
                    commit['date'].replace(' ', 'T')
                ).strftime('%a, %b %d, %Y'),
                'topic': extract_topic(commit['message']),
                'title': commit['message'],
                'content': f"Commits on this day: {commit['message']}",
                'timestamp': commit['date'],
                'commits': [commit['message']]
            }
        else:
            days[day_num]['commits'].append(commit['message'])
            days[day_num]['content'] = 'Commits: ' + ' | '.join(days[day_num]['commits'])

    # Convert to sorted list
    log_entries = []
    for day_num in sorted(days.keys(), reverse=True):
        entry = days[day_num]
        del entry['commits']  # Remove temporary field
        log_entries.append(entry)

    # Write log.json
    os.makedirs(os.path.dirname(LOG_FILE), exist_ok=True)
    with open(LOG_FILE, 'w') as f:
        json.dump(log_entries, f, indent=2)
    
    print(f"✅ Updated tracker/log.json with {len(log_entries)} days from {len(commits)} commits")

if __name__ == '__main__':
    generate_log()
