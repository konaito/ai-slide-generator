# AI Slide Generator - Frontend Configuration

## Package Manager
This project uses **Bun** as the package manager for optimal performance.

## Development Commands
- Install dependencies: `bun install`
- Run development server: `bun run dev`
- Build for production: `bun run build`
- Start production server: `bun run start`
- Run linting: `bun run lint`

## Project Structure
- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4
- **UI Components**: shadcn/ui (to be integrated)
- **Architecture**: React Server Components

## API Integration
- Backend API endpoints: `/api/v1/slides`, `/api/v1/tasks`
- File upload with PDF/text support
- Real-time slide generation with LangChain + GPT-4o

## Important Notes
- Do NOT run `bun run dev` automatically - let user start development server manually
- Always use Bun for package management operations
- Follow MVP requirements: local execution, PDF output only initially