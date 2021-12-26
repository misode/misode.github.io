describe('Generators', () => {
	beforeEach(() => {
		cy.visit('/loot-table/')
		cy.contains('h1', 'Loot Table Generator').should('exist')
		cy.contains('label', 'Pools').should('exist')
	})

	it('can change an input field', () => {
		cy.get('label:contains("Rolls") ~ input').clear().type('4').blur()
		cy.get('[data-cy=import-area]').should('contain.value', '"rolls": 4')
	})

	it('can change a dropdown', () => {
		cy.get('label:contains("Type") ~ select').first().select('minecraft:entity')
		cy.get('[data-cy=import-area]').should('contain.value', '"type": "minecraft:entity"')
	})

	it('can add an element to an array', () => {
		cy.get('label:contains("Pools") ~ button').click()
		cy.get('[data-cy=tree]')
			.find('label:contains("Rolls")').should('have.length', 2)
	})

	it('can remove an element from an array', () => {
		cy.contains('label', 'Pools')
			.get('button[aria-label="Remove"]').first().click()
		cy.get('label:contains("Rolls")').should('not.exist')
	})

	it('can change a boolean field', () => {
		cy.get('label:contains("Functions") ~ button').first().click()
		cy.get('label:contains("Function") ~ select').should('have.value', 'minecraft:set_count')
		cy.get('label:contains("Add") ~ button:contains("False")').click()
		cy.get('[data-cy=import-area]').should('contain.value', '"add": false')
		cy.get('label:contains("Add") ~ button:contains("False")').click()
		cy.get('[data-cy=import-area]').should('not.contain.value', '"add": false')
		cy.get('label:contains("Add") ~ button:contains("True")').click()
		cy.get('[data-cy=import-area]').should('contain.value', '"add": true')
	})

	it('can collapse an element', () => {
		cy.contains('label', 'Pools')
			.get('button[aria-label^="Collapse"]').first().click()
		cy.get('label:contains("Rolls")').should('not.exist')
		cy.contains('label', 'Pools')
			.get('button[aria-label^="Expand"]').first().click()
		cy.get('[data-cy=tree]')
			.find('label:contains("Rolls")').should('have.length', 1)
	})

	it('can move elements in an array', () => {
		cy.get('label:contains("Rolls") ~ input').clear().type('4').blur()
		cy.get('[data-cy=import-area]').should('contain.value', '"rolls": 4')
		cy.get('label:contains("Rolls") ~ input').first().should('have.value', '4')
		cy.get('label:contains("Pools") ~ button').click()
		cy.get('[data-cy=tree]')
			.find('label:contains("Rolls")').should('have.length', 2)
		cy.get('label:contains("Rolls") ~ input').first().should('have.value', '1')
		cy.get('button[aria-label="Move down"]').first().click()
		cy.get('label:contains("Rolls") ~ input').first().should('have.value', '4')
		cy.get('button[aria-label="Move up"]').last().click()
		cy.get('label:contains("Rolls") ~ input').first().should('have.value', '1')
	})
})
