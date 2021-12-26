describe('Settings and navigation', () => {

	describe('Homepage', () => {
		beforeEach(() => {
			cy.visit('/')
			cy.contains('h1', 'Data Pack Generators').should('exist')
		})

		it('can switch themes', () => {
			cy.get('[data-cy=theme-switcher]').click()
				.contains('Light').click()
			cy.get('html').invoke('attr', 'data-theme').should('eq', 'light')
		})
	
		it('can switch languages', () => {
			cy.get('[data-cy=language-switcher]').click()
				.contains('Deutsch').click()
			cy.contains('h1', 'Datenpaketgeneratoren').should('exist')
		})
	
		it('can open a generator', () => {
			cy.contains('Loot Table').click()
			cy.url().should('contain', '/loot-table')
			cy.contains('h1', 'Loot Table Generator').should('exist')
			  cy.contains('label', 'Pools').should('exist')
		})
	})


	describe('Generators', () => {
		beforeEach(() => {
			cy.visit('/loot-table/')
			cy.contains('h1', 'Loot Table Generator').should('exist')
			cy.contains('label', 'Pools').should('exist')
		})

		it('can switch between generators', () => {
			cy.get('[data-cy=generator-switcher]').click()
				.contains('Predicate').click()
			cy.url().should('contain', '/predicate')
			cy.contains('h1', 'Predicate Generator').should('exist')
		})
	
		it('can switch schema versions', () => {
			cy.contains('Constant').should('exist')
			cy.contains('Exact').should('not.exist')
			cy.get('[data-cy=version-switcher]').click()
				.contains('1.16').click()
			cy.contains('Exact').should('exist')
			cy.contains('Constant').should('not.exist')
		})
	
		it('can load a preset', () => {
			cy.contains('Presets').click()
			cy.contains('blocks/acacia_log').click()
			cy.get('label:contains("Name") ~ input').should('have.value', 'minecraft:acacia_log')
		})
	
		it('can import JSON', () => {
			cy.contains('Import').click()
			cy.get('[data-cy=import-area]')
				.type('{"pools":[{"rolls":2,"entries":[{"type":"minecraft:item","name":"minecraft:diamond"}]}]}', { parseSpecialCharSequences: false })
				.blur()
			cy.get('label:contains("Name") ~ input').should('have.value', 'minecraft:diamond')
			cy.get('label:contains("Rolls") ~ input').should('have.value', '2')
		})

		it('can output YAML', () => {
			cy.get('[data-cy=source-controls]').click()
				.contains('YAML').click()
			cy.get('[data-cy=import-area]').should('have.value', "pools:\n  - rolls: 1\n    entries:\n      - type: 'minecraft:item'\n        name: 'minecraft:stone'\n")
		})

		it('can output minified', () => {
			cy.get('[data-cy=source-controls]').click()
				.contains('Minified').click()
			cy.get('[data-cy=import-area]').should('have.value', '{"pools":[{"rolls":1,"entries":[{"type":"minecraft:item","name":"minecraft:stone"}]}]}\n')
		})

		it('can go back to the homepage', () => {
			cy.get('[data-cy=home-link]').click()
			cy.url().should('not.contain', '/loot-table')
			cy.contains('h1', 'Data Pack Generators').should('exist')
		})
	})
})
