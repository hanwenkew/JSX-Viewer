import { render, screen, fireEvent } from '@testing-library/react';
import App from '../App';
import { describe, it, expect, vi } from 'vitest';

describe('App', () => {
  it('renders the startup screen when no files are open', () => {
    render(<App />);
    expect(screen.getByText('JSX Viewer')).toBeInTheDocument();
    expect(screen.getByText('Open file')).toBeInTheDocument();
    expect(screen.getByText('New file')).toBeInTheDocument();
  });

  it('creates a new file when clicking "New file"', () => {
    render(<App />);
    const newFileButton = screen.getByText('New file');
    fireEvent.click(newFileButton);
    
    // Check if we are in the editor view
    expect(screen.getByText('Untitled.jsx')).toBeInTheDocument();
    expect(screen.getByTitle('Split View')).toBeInTheDocument();
  });
});
