import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { IssuePanel } from '@/components/content/IssuePanel'

vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, href, ...rest }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={href} {...rest}>{children}</a>,
}))

const labels = {
  title: 'Número de la revista', inIssue: 'Este artículo está en el número de {month}.', isEditorial: 'Es su editorial.', editIssue: 'Editar este número',
  notInIssue: 'Si este texto es el editorial de un número, enlázalo con los artículos que le corresponden.', createIssue: 'Crear un número con este editorial',
  addToIssue: 'Añadir a un número que ya existe', publishFirst: 'Publica el artículo primero; después podrás enlazarlo a un número.',
}

describe('IssuePanel (edit page, editors and admins only)', () => {
  it('offers to create an issue with this article as its editorial', () => {
    render(<IssuePanel articleId="art-1" published issue={null} isEditorial={false} labels={labels} />)
    expect(screen.getByRole('link', { name: 'Crear un número con este editorial' })).toHaveAttribute('href', '/admin/issues/new?editorial=art-1')
    expect(screen.getByRole('link', { name: 'Añadir a un número que ya existe' })).toHaveAttribute('href', '/admin/issues')
  })

  it('tells which issue the article is in, says when it is the editorial, and links to that issue', () => {
    render(<IssuePanel articleId="art-1" published issue={{ id: 'iss-9', monthLabel: 'septiembre de 2026' }} isEditorial labels={labels} />)
    expect(screen.getByText('Este artículo está en el número de septiembre de 2026. Es su editorial.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Editar este número' })).toHaveAttribute('href', '/admin/issues/iss-9')
    expect(screen.queryByRole('link', { name: 'Crear un número con este editorial' })).not.toBeInTheDocument()
  })

  it('asks to publish a draft before it can be linked', () => {
    render(<IssuePanel articleId="art-1" published={false} issue={null} isEditorial={false} labels={labels} />)
    expect(screen.getByText(/Publica el artículo primero/)).toBeInTheDocument()
    expect(screen.queryByRole('link')).not.toBeInTheDocument()
  })
})
