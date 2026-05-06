package parser

import (
	"github.com/xwb1989/sqlparser"
)

func parseSelect(sel *sqlparser.Select) (*QueryAST, error) {
	ast := &QueryAST{
		Type: "SELECT",
	}

	// Extract fields
	for _, expr := range sel.SelectExprs {
		switch e := expr.(type) {
		case *sqlparser.AliasedExpr:
			switch subE := e.Expr.(type) {
			case *sqlparser.ColName:
				ast.Fields = append(ast.Fields, FieldNode{
					Name:  subE.Name.String(),
					Table: subE.Qualifier.Name.String(),
					Alias: e.As.String(),
				})
			case *sqlparser.FuncExpr:
				ast.Fields = append(ast.Fields, FieldNode{
					Name:      sqlparser.String(subE),
					Aggregate: subE.Name.String(),
					Alias:     e.As.String(),
				})
			}
		case *sqlparser.StarExpr:
			ast.Fields = append(ast.Fields, FieldNode{
				Name:  "*",
				Table: e.TableName.Name.String(),
			})
		}
	}

	// Extract tables
	for _, from := range sel.From {
		extractTables(from, ast)
	}

	// Conditions
	if sel.Where != nil {
		extractSubqueries(sel.Where.Expr, ast)
		switch expr := sel.Where.Expr.(type) {
		case *sqlparser.ComparisonExpr:
			ast.Conditions = append(ast.Conditions, ConditionNode{
				Left:     sqlparser.String(expr.Left),
				Operator: expr.Operator,
				Right:    sqlparser.String(expr.Right),
			})
		}
	}

	// Limit
	if sel.Limit != nil {
		if _, err := sqlparser.String(sel.Limit.Rowcount), error(nil); err == nil {
			ast.Limit = new(int) // mark non-nil
		}
	}

	return ast, nil
}

func extractSubqueries(expr sqlparser.Expr, ast *QueryAST) {
	switch e := expr.(type) {
	case *sqlparser.Subquery:
		if sel, ok := e.Select.(*sqlparser.Select); ok {
			for _, from := range sel.From {
				extractTables(from, ast)
			}
			if sel.Where != nil {
				extractSubqueries(sel.Where.Expr, ast)
			}
		}
	case *sqlparser.ComparisonExpr:
		extractSubqueries(e.Left, ast)
		extractSubqueries(e.Right, ast)
	case *sqlparser.AndExpr:
		extractSubqueries(e.Left, ast)
		extractSubqueries(e.Right, ast)
	case *sqlparser.OrExpr:
		extractSubqueries(e.Left, ast)
		extractSubqueries(e.Right, ast)
	case *sqlparser.ParenExpr:
		extractSubqueries(e.Expr, ast)
	}
}

func extractTables(expr sqlparser.TableExpr, ast *QueryAST) {
	switch t := expr.(type) {
	case *sqlparser.AliasedTableExpr:
		switch te := t.Expr.(type) {
		case sqlparser.TableName:
			name := te.Name.String()
			db := te.Qualifier.String()
			
			// Prevent duplicates
			exists := false
			for _, existing := range ast.Tables {
				if existing.Name == name && existing.Database == db {
					exists = true
					break
				}
			}
			
			if !exists {
				ast.Tables = append(ast.Tables, TableNode{
					Database: db,
					Name:     name,
					Alias:    t.As.String(),
				})
			}
		}
	case *sqlparser.JoinTableExpr:
		joinNode := JoinNode{
			Type: t.Join,
		}

		if left, ok := t.LeftExpr.(*sqlparser.AliasedTableExpr); ok {
			joinNode.LeftTable = left.As.String()
			if joinNode.LeftTable == "" {
				if te, ok := left.Expr.(sqlparser.TableName); ok {
					joinNode.LeftTable = te.Name.String()
				}
			}
		}

		if right, ok := t.RightExpr.(*sqlparser.AliasedTableExpr); ok {
			joinNode.RightTable = right.As.String()
			if joinNode.RightTable == "" {
				if te, ok := right.Expr.(sqlparser.TableName); ok {
					joinNode.RightTable = te.Name.String()
				}
			}
		}

		if t.Condition.On != nil {
			if comp, ok := t.Condition.On.(*sqlparser.ComparisonExpr); ok {
				joinNode.On = ConditionNode{
					Left:     sqlparser.String(comp.Left),
					Operator: comp.Operator,
					Right:    sqlparser.String(comp.Right),
				}
			}
		}

		ast.Joins = append(ast.Joins, joinNode)

		extractTables(t.LeftExpr, ast)
		extractTables(t.RightExpr, ast)
	}
}

