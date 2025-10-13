#!/usr/bin/env python3
"""Test the ML prepack batch recommendations endpoint."""

import requests
import json
import time

ML_SERVICE_URL = 'http://localhost:8000'

def test_endpoint():
    print('=' * 60)
    print('TESTING ML PREPACK BATCH RECOMMENDATIONS')
    print('=' * 60)
    print()

    url = f"{ML_SERVICE_URL}/api/ml/prepack-batch-recommendations?limit=5"
    print(f"Calling: {url}\n")

    start_time = time.time()

    try:
        response = requests.post(url, json={}, timeout=30)

        end_time = time.time()
        response_time = end_time - start_time

        print(f"✅ Response received in {response_time:.2f}s")
        print(f"   Status Code: {response.status_code}")
        print(f"   Performance: {'✅ PASS' if response_time < 5 else '❌ FAIL'} (<5s required)\n")

        if response.status_code == 200:
            data = response.json()

            print('=' * 60)
            print('RESPONSE DATA')
            print('=' * 60)
            print(json.dumps(data, indent=2))
            print()

            # Check for Style 8501B
            print('=' * 60)
            print('CHECKING FOR STYLE 8501B')
            print('=' * 60)

            style_8501B = None
            if data.get('recommendations'):
                for rec in data['recommendations']:
                    if rec['style_number'] == '8501B':
                        style_8501B = rec
                        break

            if style_8501B:
                print('✅ Style 8501B found!')
                print(f"   Vendor: {style_8501B['vendor_name']}")
                print(f"   Urgency: {style_8501B['urgency']}")
                print(f"   Days of Supply: {style_8501B.get('days_of_supply', 'N/A')}")
                print(f"   Recommendation: {style_8501B['recommendation']}")
                print(f"   Total Boxes: {style_8501B['total_boxes']}")
                print(f"   Total Cost: ${style_8501B['total_cost']:.2f}")

                if style_8501B.get('color_breakdown'):
                    print(f"   Color Breakdown ({len(style_8501B['color_breakdown'])} colors):")
                    for cb in style_8501B['color_breakdown']:
                        print(f"     • {cb['color']}: {cb['boxes']} boxes {cb['pack_name']} (${cb['total_cost']:.2f})")
            else:
                print('⚠️  Style 8501B not in recommendations')
                print(f"   Total recommendations returned: {len(data.get('recommendations', []))}")
                if data.get('recommendations'):
                    print(f"   Styles found: {[r['style_number'] for r in data['recommendations']]}")

            print()
            print('=' * 60)
            print('TEST SUMMARY')
            print('=' * 60)
            print(f"✅ Endpoint working: YES")
            print(f"✅ Response time: {response_time:.2f}s ({'PASS' if response_time < 5 else 'FAIL'})")
            print(f"✅ Recommendations: {data.get('count', 0)}")
            print(f"✅ Style 8501B found: {'YES' if style_8501B else 'NO'}")

            # Check color-specific format
            has_color_in_rec = False
            if style_8501B and '(' in style_8501B['recommendation'] and ')' in style_8501B['recommendation']:
                has_color_in_rec = True
            print(f"✅ Color-specific format: {'YES' if has_color_in_rec else 'NO'}")
            print('=' * 60)

        else:
            print(f"❌ Error: Status code {response.status_code}")
            print(response.text)

    except requests.exceptions.Timeout:
        print("❌ Request timed out after 30 seconds")
    except requests.exceptions.ConnectionError:
        print(f"❌ Could not connect to {ML_SERVICE_URL}")
        print("   Make sure the ML service is running")
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == '__main__':
    test_endpoint()
