## Requirement
* commit auth token
* after actions/checkout


## Example usage

```yaml
on: [workflow_dispatch]

jobs:
  hello_world_job:
    runs-on: ubuntu-latest    
    steps:
      - name: 檢查分支
        uses: actions/checkout@v4
        with:
          fetch-depth: '0'
    steps:
      - name: 觸發action
        uses: howard-bitgaming/helmfile-updater@main
        with:
          token: ${{secrets.TEST_TOKEN}}
          file: './folder/sub/helmfile.yaml'
          key: 'fastpack-web-frontend'
          value: '123.445.22'
```
