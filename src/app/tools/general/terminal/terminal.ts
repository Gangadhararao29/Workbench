import { Component, Input, signal, computed, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

type Category = 'git' | 'docker' | 'npm' | 'dotnet' | 'k8s';

interface CommandParam {
  key: string;
  label: string;
  default: string;
}

interface CommandTemplate {
  name: string;
  description: string;
  command: string;
  params: CommandParam[];
  level: 'basic' | 'advanced';
}

@Component({
  selector: 'app-terminal-tool',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './terminal.html',
  styleUrls: ['./terminal.css'],
})
export class TerminalTool {
  @Input({ required: true }) instanceId!: string;

  activeCategory = signal<Category>('git');
  searchQuery = signal('');
  activeLevel = signal<'all' | 'basic' | 'advanced'>('all');
  selectedCommand = signal<CommandTemplate | null>(null);

  // Custom values for command parameters
  paramValues = signal<Record<string, string>>({});

  commands: Record<Category, CommandTemplate[]> = {
    git: [
      // --- Basic (ordered roughly by daily-use frequency) ---
      {
        name: 'Clone Repository',
        description: 'Clone a repository into a new directory.',
        command: 'git clone {repoUrl}',
        params: [
          { key: 'repoUrl', label: 'Repository URL', default: 'https://github.com/user/repo.git' },
        ],
        level: 'basic',
      },
      {
        name: 'Check Status',
        description: 'Show the working tree status: staged, unstaged, and untracked changes.',
        command: 'git status',
        params: [],
        level: 'basic',
      },
      {
        name: 'Stage Changes',
        description: 'Add file changes to the staging area before committing.',
        command: 'git add {filePath}',
        params: [{ key: 'filePath', label: 'File Path (or . for all)', default: '.' }],
        level: 'basic',
      },
      {
        name: 'Commit Changes',
        description: 'Record changes to the repository with a commit message.',
        command: 'git commit -m "{message}"',
        params: [{ key: 'message', label: 'Commit Message', default: 'feat: add database schema' }],
        level: 'basic',
      },
      {
        name: 'Pull Latest Changes',
        description: 'Fetch and merge changes from the remote branch.',
        command: 'git pull origin {branchName}',
        params: [{ key: 'branchName', label: 'Branch Name', default: 'main' }],
        level: 'basic',
      },
      {
        name: 'Create & Switch Branch',
        description: 'Create a new local branch and check it out.',
        command: 'git checkout -b {branchName}',
        params: [{ key: 'branchName', label: 'Branch Name', default: 'feature/new-api' }],
        level: 'basic',
      },
      {
        name: 'Push New Branch',
        description: 'Push a new branch to origin and track it upstream.',
        command: 'git push -u origin {branchName}',
        params: [{ key: 'branchName', label: 'Branch Name', default: 'feature/new-api' }],
        level: 'basic',
      },
      {
        name: 'View Diff',
        description: 'Show unstaged changes between working directory and last commit.',
        command: 'git diff {filePath}',
        params: [{ key: 'filePath', label: 'File Path (optional)', default: '' }],
        level: 'basic',
      },
      {
        name: 'Stash Work-in-Progress',
        description: 'Temporarily shelve changes without committing.',
        command: 'git stash save "{message}"',
        params: [{ key: 'message', label: 'Stash Description', default: 'WIP: form validation' }],
        level: 'basic',
      },
      {
        name: 'Unstage File',
        description: 'Remove a file from the staging area without discarding its changes.',
        command: 'git reset HEAD {filePath}',
        params: [{ key: 'filePath', label: 'File Path', default: 'src/app.ts' }],
        level: 'basic',
      },
      {
        name: 'Fetch All & Prune',
        description:
          'Download objects and refs from all remotes, and delete stale tracking branches.',
        command: 'git fetch --all --prune',
        params: [],
        level: 'basic',
      },
      {
        name: 'Merge Branch',
        description: 'Join two development histories together, creating a merge commit.',
        command: 'git merge {branchName} --no-ff',
        params: [{ key: 'branchName', label: 'Branch to merge into current', default: 'develop' }],
        level: 'basic',
      },
      {
        name: 'Clean Untracked Files',
        description: 'Remove untracked files and directories from the working tree.',
        command: 'git clean -fd',
        params: [],
        level: 'basic',
      },
      // --- Advanced ---
      {
        name: 'Undo Last Commit (Keep Files)',
        description: 'Undo the last commit but keep your changes staged in the working directory.',
        command: 'git reset --soft HEAD~1',
        params: [],
        level: 'advanced',
      },
      {
        name: 'Undo Last Commit (Discard Files)',
        description:
          'Undo the last commit and permanently delete all changes in the working directory.',
        command: 'git reset --hard HEAD~1',
        params: [],
        level: 'advanced',
      },
      {
        name: 'Reset Branch to Origin',
        description: 'Discard all local commits and files to match the remote tracking branch.',
        command: 'git reset --hard origin/{branchName}',
        params: [{ key: 'branchName', label: 'Remote Branch Name', default: 'main' }],
        level: 'advanced',
      },
      {
        name: 'Amend Commit Message',
        description: 'Amend the last commit message without changing files.',
        command: 'git commit --amend -m "{message}"',
        params: [
          {
            key: 'message',
            label: 'New Commit Message',
            default: 'feat: add database schema (revised)',
          },
        ],
        level: 'advanced',
      },
      {
        name: 'Amend Commit with Staged Files',
        description: 'Add newly staged files to the last commit without changing the message.',
        command: 'git commit --amend --no-edit',
        params: [],
        level: 'advanced',
      },
      {
        name: 'Pull with Rebase',
        description: 'Fetch remote changes and rebase your local commits on top of them.',
        command: 'git pull --rebase origin {branchName}',
        params: [{ key: 'branchName', label: 'Remote Branch Name', default: 'main' }],
        level: 'advanced',
      },
      {
        name: 'Interactive Rebase / Squash',
        description: 'Rebase and squash your commits on current branch.',
        command: 'git rebase -i HEAD~{numCommits}',
        params: [{ key: 'numCommits', label: 'Number of Commits to inspect', default: '3' }],
        level: 'advanced',
      },
      {
        name: 'Cherry Pick Commit',
        description: 'Apply the changes introduced by an existing commit to your current branch.',
        command: 'git cherry-pick {commitHash}',
        params: [{ key: 'commitHash', label: 'Commit SHA Hash', default: 'a1b2c3d' }],
        level: 'advanced',
      },
      {
        name: 'Revert Commit',
        description: 'Create a new commit that reverts the changes of a past commit.',
        command: 'git revert {commitHash}',
        params: [{ key: 'commitHash', label: 'Commit SHA Hash to revert', default: 'a1b2c3d' }],
        level: 'advanced',
      },
      {
        name: 'Apply Specific Stash Index',
        description:
          'Restore and apply changes from a specific stash without removing it from the list.',
        // NOTE: double braces are intentional — {{stashIndex}} is param-substituted
        // down to {stashIndex} -> value, leaving git's own stash@{N} syntax intact.
        command: 'git stash apply stash@{{stashIndex}}',
        params: [{ key: 'stashIndex', label: 'Stash Index Number', default: '0' }],
        level: 'advanced',
      },
      {
        name: 'Pop Specific Stash Index',
        description: 'Restore and apply changes from a specific stash and remove it from the list.',
        command: 'git stash pop stash@{{stashIndex}}',
        params: [{ key: 'stashIndex', label: 'Stash Index Number', default: '0' }],
        level: 'advanced',
      },
      {
        name: 'List Stashes',
        description: 'List the stashed state modifications in your history.',
        command: 'git stash list',
        params: [],
        level: 'advanced',
      },
      {
        name: 'Clear All Stashes',
        description: 'Remove all the stashed states from your local history.',
        command: 'git stash clear',
        params: [],
        level: 'advanced',
      },
      {
        name: 'Pretty Graph History',
        description: 'Display a graphic representation of commit history.',
        command: 'git log --graph --oneline --decorate --all',
        params: [],
        level: 'advanced',
      },
      {
        name: 'Find Commits by Message',
        description: 'Filter commit history to match a commit message pattern.',
        command: 'git log --grep="{pattern}"',
        params: [{ key: 'pattern', label: 'Search Keyword', default: 'vulnerability' }],
        level: 'advanced',
      },
      {
        name: 'Git Blame File Lines',
        description: 'Annotate lines of a file with commit metadata.',
        command: 'git blame -L {startLine},{endLine} {filePath}',
        params: [
          { key: 'startLine', label: 'Start Line Number', default: '10' },
          { key: 'endLine', label: 'End Line Number', default: '30' },
          { key: 'filePath', label: 'File Path', default: 'src/App.ts' },
        ],
        level: 'advanced',
      },
      {
        name: 'Tag a Release',
        description: 'Create an annotated tag, commonly used to mark release versions.',
        command: 'git tag -a {tagName} -m "{message}"',
        params: [
          { key: 'tagName', label: 'Tag Name', default: 'v1.0.0' },
          { key: 'message', label: 'Tag Message', default: 'Release version 1.0.0' },
        ],
        level: 'advanced',
      },
      {
        name: 'Add Worktree',
        description:
          'Check out a branch into a separate working directory without switching your main one.',
        command: 'git worktree add {path} {branchName}',
        params: [
          { key: 'path', label: 'New Worktree Directory', default: '../hotfix' },
          { key: 'branchName', label: 'Branch Name', default: 'hotfix/urgent-fix' },
        ],
        level: 'advanced',
      },
    ],
    docker: [
      // --- Basic ---
      {
        name: 'List Running Containers',
        description: 'Show currently running containers.',
        command: 'docker ps',
        params: [],
        level: 'basic',
      },
      {
        name: 'List All Containers',
        description: 'Show all containers, including stopped ones.',
        command: 'docker ps -a',
        params: [],
        level: 'basic',
      },
      {
        name: 'Run Container',
        description: 'Start a container in detached mode with port mapping.',
        command: 'docker run -p {hostPort}:{containerPort} --name {name} -d {image}',
        params: [
          { key: 'hostPort', label: 'Host Port', default: '8080' },
          { key: 'containerPort', label: 'Container Port', default: '80' },
          { key: 'name', label: 'Container Name', default: 'my-web-app' },
          { key: 'image', label: 'Docker Image', default: 'nginx:latest' },
        ],
        level: 'basic',
      },
      {
        name: 'Build Docker Image',
        description: 'Build an image from a Dockerfile in context directory.',
        command: 'docker build -t {imageName}:{tag} {contextDir}',
        params: [
          { key: 'imageName', label: 'Image Name', default: 'my-app' },
          { key: 'tag', label: 'Tag', default: 'latest' },
          { key: 'contextDir', label: 'Context Directory', default: '.' },
        ],
        level: 'basic',
      },
      {
        name: 'Compose Up',
        description:
          'Build and start all services defined in a docker-compose file, in the background.',
        command: 'docker compose up -d --build',
        params: [],
        level: 'basic',
      },
      {
        name: 'Compose Down',
        description: 'Stop and remove containers, networks, and volumes created by Compose Up.',
        command: 'docker compose down',
        params: [],
        level: 'basic',
      },
      {
        name: 'Follow Container Logs',
        description: 'View and stream logs from a specific container.',
        command: 'docker logs -f --tail {numLines} {containerId}',
        params: [
          { key: 'numLines', label: 'Number of Lines', default: '100' },
          { key: 'containerId', label: 'Container Name or ID', default: 'my-web-app' },
        ],
        level: 'basic',
      },
      {
        name: 'Stop Container',
        description: 'Stop one or more running containers.',
        command: 'docker stop {containerId}',
        params: [{ key: 'containerId', label: 'Container Name or ID', default: 'my-web-app' }],
        level: 'basic',
      },
      {
        name: 'Remove Container',
        description: 'Delete a stopped container.',
        command: 'docker rm {containerId}',
        params: [{ key: 'containerId', label: 'Container Name or ID', default: 'my-web-app' }],
        level: 'basic',
      },
      {
        name: 'Remove Image',
        description: 'Delete a local Docker image.',
        command: 'docker rmi {imageName}',
        params: [{ key: 'imageName', label: 'Image Name or ID', default: 'my-app:latest' }],
        level: 'basic',
      },
      // --- Advanced ---
      {
        name: 'Container Shell Execution',
        description: 'Run an interactive command shell session inside a container.',
        command: 'docker exec -it {containerId} {shell}',
        params: [
          { key: 'containerId', label: 'Container Name/ID', default: 'my-web-app' },
          { key: 'shell', label: 'Shell Environment (bash / sh)', default: 'bash' },
        ],
        level: 'advanced',
      },
      {
        name: 'Copy Files',
        description: 'Copy files/folders between a container and local filesystem.',
        command: 'docker cp {sourcePath} {containerId}:{destPath}',
        params: [
          { key: 'sourcePath', label: 'Source Path (Local/Container)', default: './dist' },
          { key: 'containerId', label: 'Container ID', default: 'my-web-app' },
          {
            key: 'destPath',
            label: 'Destination Path (Container/Local)',
            default: '/usr/share/nginx/html',
          },
        ],
        level: 'advanced',
      },
      {
        name: 'Display Resource Usage',
        description: 'Stream container resource usage statistics.',
        command: 'docker stats',
        params: [],
        level: 'advanced',
      },
      {
        name: 'Inspect Container Details',
        description: 'Return low-level information on Docker objects.',
        command: 'docker inspect {containerId}',
        params: [{ key: 'containerId', label: 'Container ID or Name', default: 'my-web-app' }],
        level: 'advanced',
      },
      {
        name: 'List Networks',
        description: 'List all Docker networks.',
        command: 'docker network ls',
        params: [],
        level: 'advanced',
      },
      {
        name: 'List Volumes',
        description: 'List all Docker volumes.',
        command: 'docker volume ls',
        params: [],
        level: 'advanced',
      },
      {
        name: 'Prune System (Clean Up)',
        description: 'Remove all unused containers, networks, images, and optionally volumes.',
        command: 'docker system prune -a --volumes -f',
        params: [],
        level: 'advanced',
      },
    ],
    npm: [
      // --- Basic ---
      {
        name: 'Install Dependencies',
        description: 'Install all dependencies listed in package.json.',
        command: 'npm install',
        params: [],
        level: 'basic',
      },
      {
        name: 'Clean Install (CI)',
        description:
          'Install exact versions from package-lock.json — faster and safer for CI pipelines.',
        command: 'npm ci',
        params: [],
        level: 'basic',
      },
      {
        name: 'Install Package',
        description: 'Install a dependency package.',
        command: 'npm install {packageName} {saveType}',
        params: [
          { key: 'packageName', label: 'Package Name', default: 'lodash' },
          { key: 'saveType', label: 'Dependency Style (--save / --save-dev)', default: '--save' },
        ],
        level: 'basic',
      },
      {
        name: 'Uninstall Package',
        description: 'Remove a dependency package from the project.',
        command: 'npm uninstall {packageName}',
        params: [{ key: 'packageName', label: 'Package Name', default: 'lodash' }],
        level: 'basic',
      },
      {
        name: 'Run Custom Script',
        description: 'Execute scripts defined in package.json.',
        command: 'npm run {scriptName}',
        params: [{ key: 'scriptName', label: 'Script Name', default: 'dev' }],
        level: 'basic',
      },
      {
        name: 'Run with npx',
        description: 'Execute a binary package command without installing it globally or locally.',
        command: 'npx {commandName}',
        params: [{ key: 'commandName', label: 'Command Name', default: 'rimraf' }],
        level: 'basic',
      },
      {
        name: 'Check Outdated Packages',
        description: 'List installed packages that have newer versions available.',
        command: 'npm outdated',
        params: [],
        level: 'basic',
      },
      {
        name: 'Update Packages',
        description: 'Update packages to the latest version allowed by package.json.',
        command: 'npm update',
        params: [],
        level: 'basic',
      },
      {
        name: 'Audit and Force Fix',
        description:
          'Scan and repair security vulnerabilities. Can bump major versions — review changes after running.',
        command: 'npm audit fix --force',
        params: [],
        level: 'basic',
      },
      // --- Advanced ---
      {
        name: 'List Dependency Tree',
        description: 'Display installed packages in a tree structure.',
        command: 'npm list --depth={depth}',
        params: [{ key: 'depth', label: 'Max Tree Depth', default: '0' }],
        level: 'advanced',
      },
      {
        name: 'Link Local Package',
        description: 'Symlink a package folder for local development testing.',
        command: 'npm link {packageName}',
        params: [{ key: 'packageName', label: 'Package Name', default: 'my-common-lib' }],
        level: 'advanced',
      },
      {
        name: 'Clean Package Cache',
        description: 'Forcefully clear package cache folders.',
        command: 'npm cache clean --force',
        params: [],
        level: 'advanced',
      },
      {
        name: 'Publish Package',
        description: 'Publish a package to the npm registry.',
        command: 'npm publish --tag {tag} --access {access}',
        params: [
          { key: 'tag', label: 'Dist Tag', default: 'latest' },
          { key: 'access', label: 'Access Level (public/restricted)', default: 'public' },
        ],
        level: 'advanced',
      },
    ],
    dotnet: [
      // --- Basic ---
      {
        name: 'New Solution/Project',
        description: 'Create a new .NET project with a specified template.',
        command: 'dotnet new {template} -n {projectName}',
        params: [
          { key: 'template', label: 'Template Name (webapi, mvc, classlib)', default: 'webapi' },
          { key: 'projectName', label: 'Project Name', default: 'MySolution.Api' },
        ],
        level: 'basic',
      },
      {
        name: 'Restore Nuget Packages',
        description: 'Restore dependencies and project-specific tools.',
        command: 'dotnet restore',
        params: [],
        level: 'basic',
      },
      {
        name: 'Build Project',
        description: 'Build a project and its dependencies.',
        command: 'dotnet build {projectPath}',
        params: [{ key: 'projectPath', label: 'Path to .csproj file (optional)', default: '' }],
        level: 'basic',
      },
      {
        name: 'Run App',
        description: 'Build and run a specific .NET project.',
        command: 'dotnet run --project {projectPath}',
        params: [
          {
            key: 'projectPath',
            label: 'Path to .csproj file',
            default: 'src/MyProject/MyProject.csproj',
          },
        ],
        level: 'basic',
      },
      {
        name: 'Watch & Run',
        description:
          'Run the app and automatically rebuild/restart on file changes — ideal for local development.',
        command: 'dotnet watch run --project {projectPath}',
        params: [
          {
            key: 'projectPath',
            label: 'Path to .csproj file',
            default: 'src/MyProject/MyProject.csproj',
          },
        ],
        level: 'basic',
      },
      {
        name: 'Run Tests',
        description: 'Execute unit tests in the project or solution.',
        command: 'dotnet test {projectPath}',
        params: [{ key: 'projectPath', label: 'Path to test project (optional)', default: '' }],
        level: 'basic',
      },
      {
        name: 'Add NuGet Package',
        description: 'Install a NuGet package dependency.',
        command: 'dotnet add {projectPath} package {packageName} --version {version}',
        params: [
          { key: 'projectPath', label: 'Project Path', default: 'src/MyProject/MyProject.csproj' },
          { key: 'packageName', label: 'Package Name', default: 'Microsoft.EntityFrameworkCore' },
          { key: 'version', label: 'Package Version', default: '8.0.0' },
        ],
        level: 'basic',
      },
      {
        name: 'Clean Build Outputs',
        description: 'Clean the build outputs of a project.',
        command: 'dotnet clean',
        params: [],
        level: 'basic',
      },
      {
        name: 'Code Auto-Formatter',
        description: 'Format code files to comply with language guidelines.',
        command: 'dotnet format',
        params: [],
        level: 'basic',
      },
      // --- Advanced ---
      {
        name: 'Add EF Core Migration',
        description: 'Generate a new Entity Framework migration.',
        command:
          'dotnet ef migrations add {migrationName} --project {projectPath} --startup-project {startupPath}',
        params: [
          { key: 'migrationName', label: 'Migration Name', default: 'InitialCreate' },
          { key: 'projectPath', label: 'DbContext Project Path', default: 'src/MyProject.Data' },
          { key: 'startupPath', label: 'Startup Project Path', default: 'src/MyProject.Api' },
        ],
        level: 'advanced',
      },
      {
        name: 'Update Database (EF Core)',
        description: 'Apply all migrations to target database.',
        command:
          'dotnet ef database update --project {projectPath} --startup-project {startupPath}',
        params: [
          { key: 'projectPath', label: 'DbContext Project Path', default: 'src/MyProject.Data' },
          { key: 'startupPath', label: 'Startup Project Path', default: 'src/MyProject.Api' },
        ],
        level: 'advanced',
      },
      {
        name: 'Publish Project Binary',
        description: 'Pack application binaries for deployment environments.',
        command:
          'dotnet publish {projectPath} -c {configuration} -r {runtime} --self-contained {selfContained}',
        params: [
          { key: 'projectPath', label: 'Project Path', default: 'src/MyProject/MyProject.csproj' },
          {
            key: 'configuration',
            label: 'Build Configuration (Release/Debug)',
            default: 'Release',
          },
          {
            key: 'runtime',
            label: 'Runtime Target RID (win-x64, linux-x64)',
            default: 'linux-x64',
          },
          { key: 'selfContained', label: 'Self Contained (true/false)', default: 'true' },
        ],
        level: 'advanced',
      },
    ],
    k8s: [
      // --- Basic ---
      {
        name: 'Get Resources',
        description: 'List Kubernetes cluster resources in a namespace.',
        command: 'kubectl get {resourceType} -n {namespace}',
        params: [
          {
            key: 'resourceType',
            label: 'Resource Type (pods, services, deployments)',
            default: 'pods',
          },
          { key: 'namespace', label: 'Namespace', default: 'default' },
        ],
        level: 'basic',
      },
      {
        name: 'Describe Resource Details',
        description: 'Show detailed state of a resource.',
        command: 'kubectl describe {resourceType} {resourceName} -n {namespace}',
        params: [
          { key: 'resourceType', label: 'Resource Type', default: 'pod' },
          { key: 'resourceName', label: 'Resource Name', default: 'my-app-pod-123' },
          { key: 'namespace', label: 'Namespace', default: 'default' },
        ],
        level: 'basic',
      },
      {
        name: 'View Pod Stream Logs',
        description: 'Follow logs for a running container in a pod.',
        command: 'kubectl logs -f {podName} -n {namespace} --tail={numLines}',
        params: [
          { key: 'podName', label: 'Pod Name', default: 'my-app-pod-123' },
          { key: 'namespace', label: 'Namespace', default: 'default' },
          { key: 'numLines', label: 'Lines to Tail', default: '100' },
        ],
        level: 'basic',
      },
      {
        name: 'Apply YAML Manifest',
        description: 'Apply configuration changes from a manifest file.',
        command: 'kubectl apply -f {filePath}',
        params: [{ key: 'filePath', label: 'File Path', default: './deployment.yaml' }],
        level: 'basic',
      },
      {
        name: 'Delete Resource',
        description: 'Delete a Kubernetes resource by type and name.',
        command: 'kubectl delete {resourceType} {resourceName} -n {namespace}',
        params: [
          { key: 'resourceType', label: 'Resource Type', default: 'pod' },
          { key: 'resourceName', label: 'Resource Name', default: 'my-app-pod-123' },
          { key: 'namespace', label: 'Namespace', default: 'default' },
        ],
        level: 'basic',
      },
      {
        name: 'Switch Context',
        description: 'Switch the active cluster/context kubectl commands target.',
        command: 'kubectl config use-context {contextName}',
        params: [{ key: 'contextName', label: 'Context Name', default: 'staging-cluster' }],
        level: 'basic',
      },
      // --- Advanced ---
      {
        name: 'Scale Deployment',
        description: 'Change the number of running replicas for a deployment.',
        command:
          'kubectl scale deployment/{deploymentName} --replicas={replicaCount} -n {namespace}',
        params: [
          { key: 'deploymentName', label: 'Deployment Name', default: 'my-web-deploy' },
          { key: 'replicaCount', label: 'Replica Count', default: '3' },
          { key: 'namespace', label: 'Namespace', default: 'default' },
        ],
        level: 'advanced',
      },
      {
        name: 'Restart Deployment',
        description: 'Trigger a rolling rollout restart of a deployment.',
        command: 'kubectl rollout restart deployment/{deploymentName} -n {namespace}',
        params: [
          { key: 'deploymentName', label: 'Deployment Name', default: 'my-web-deploy' },
          { key: 'namespace', label: 'Namespace', default: 'default' },
        ],
        level: 'advanced',
      },
      {
        name: 'Rollout Status',
        description: 'Watch the progress of a deployment rollout.',
        command: 'kubectl rollout status deployment/{deploymentName} -n {namespace}',
        params: [
          { key: 'deploymentName', label: 'Deployment Name', default: 'my-web-deploy' },
          { key: 'namespace', label: 'Namespace', default: 'default' },
        ],
        level: 'advanced',
      },
      {
        name: 'Rollout Undo',
        description:
          'Roll a deployment back to its previous revision — the go-to command after a bad release.',
        command: 'kubectl rollout undo deployment/{deploymentName} -n {namespace}',
        params: [
          { key: 'deploymentName', label: 'Deployment Name', default: 'my-web-deploy' },
          { key: 'namespace', label: 'Namespace', default: 'default' },
        ],
        level: 'advanced',
      },
      {
        name: 'Interactive Container Execution',
        description: 'Execute an interactive terminal session inside a pod container.',
        command: 'kubectl exec -it {podName} -n {namespace} -- {command}',
        params: [
          { key: 'podName', label: 'Pod Name', default: 'my-app-pod-123' },
          { key: 'namespace', label: 'Namespace', default: 'default' },
          { key: 'command', label: 'Command (sh / bash)', default: 'bash' },
        ],
        level: 'advanced',
      },
      {
        name: 'Port Forward Pod',
        description: 'Forward local port to pod container port.',
        command: 'kubectl port-forward {podName} {localPort}:{podPort} -n {namespace}',
        params: [
          { key: 'podName', label: 'Pod Name', default: 'my-app-pod-123' },
          { key: 'localPort', label: 'Local Port', default: '9000' },
          { key: 'podPort', label: 'Pod/Container Port', default: '80' },
          { key: 'namespace', label: 'Namespace', default: 'default' },
        ],
        level: 'advanced',
      },
      {
        name: 'View Resource Metrics',
        description: 'Display resource metrics (CPU/Memory) of pods or nodes.',
        command: 'kubectl top {resourceType} -n {namespace}',
        params: [
          { key: 'resourceType', label: 'Resource Type (pods/nodes)', default: 'pods' },
          { key: 'namespace', label: 'Namespace', default: 'default' },
        ],
        level: 'advanced',
      },
      {
        name: 'Get Namespace Events',
        description:
          'List recent events in a namespace — the first place to look when a pod is failing to schedule or start.',
        command: 'kubectl get events -n {namespace} --sort-by=.metadata.creationTimestamp',
        params: [{ key: 'namespace', label: 'Namespace', default: 'default' }],
        level: 'advanced',
      },
      {
        name: 'Copy Files Pod/Local',
        description: 'Copy files and directories to and from pods.',
        command: 'kubectl cp {localPath} {podName}:{remotePath} -n {namespace}',
        params: [
          { key: 'localPath', label: 'Local File/Directory Path', default: './config.json' },
          { key: 'podName', label: 'Target Pod Name', default: 'my-app-pod-123' },
          { key: 'remotePath', label: 'Destination Pod Path', default: '/app/config.json' },
          { key: 'namespace', label: 'Namespace', default: 'default' },
        ],
        level: 'advanced',
      },
    ],
  };

  // Filter commands by active category, search query, and basic/advanced level
  filteredCommands = computed(() => {
    const list = this.commands[this.activeCategory()] || [];
    const query = this.searchQuery().toLowerCase().trim();
    const levelFilter = this.activeLevel();

    return list.filter((cmd) => {
      // 1. Filter by level
      if (levelFilter !== 'all' && cmd.level !== levelFilter) {
        return false;
      }

      // 2. Filter by search query
      if (!query) return true;
      return (
        cmd.name.toLowerCase().includes(query) ||
        cmd.description.toLowerCase().includes(query) ||
        cmd.command.toLowerCase().includes(query)
      );
    });
  });

  // Re-evaluate the parsed command code snippet dynamically
  generatedCommand = computed(() => {
    const cmd = this.selectedCommand();
    if (!cmd) return '';
    let result = cmd.command;
    const vals = this.paramValues();
    for (const p of cmd.params) {
      const raw = vals[p.key];
      const fillValue = raw !== undefined && raw.trim() !== '' ? raw : p.default;
      result = result.replace(new RegExp(`{${p.key}}`, 'g'), fillValue);
    }
    return result;
  });

  // Set the selected command and auto-initialize parameter signals
  selectCommand(cmd: CommandTemplate) {
    this.selectedCommand.set(cmd);
    const initialVals: Record<string, string> = {};
    for (const p of cmd.params) {
      initialVals[p.key] = p.default;
    }
    this.paramValues.set(initialVals);
  }

  updateParam(key: string, value: string) {
    this.paramValues.update((prev) => ({ ...prev, [key]: value }));
  }

  setCategory(cat: Category) {
    this.activeCategory.set(cat);
    this.searchQuery.set('');
    this.activeLevel.set('all'); // Reset level to all on category change
    this.selectedCommand.set(null);
  }

  setLevel(level: 'all' | 'basic' | 'advanced') {
    this.activeLevel.set(level);
    this.selectedCommand.set(null); // Reset selection to trigger default effect selection
  }

  // Copy final generated command text to keyboard clipboard
  copyCommand() {
    const code = this.generatedCommand();
    if (code) {
      navigator.clipboard.writeText(code);
    }
  }

  constructor() {
    // Keep selection valid as filters/search change: re-select a default
    // whenever the current selection falls outside the filtered list.
    effect(() => {
      const list = this.filteredCommands();
      const current = this.selectedCommand();
      const stillVisible = !!current && list.some((c) => c.name === current.name);

      if (list.length > 0 && !stillVisible) {
        this.selectCommand(list[0]);
      } else if (list.length === 0 && current) {
        this.selectedCommand.set(null);
      }
    });
  }
}
